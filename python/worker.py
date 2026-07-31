#!/usr/bin/env python3
"""
WD14 batch worker for Eagle plugin.
Keeps the model loaded and processes many images via JSON lines over stdin/stdout.

Protocol (one JSON object per line on stdin):
  {"cmd":"ping"}
  {"cmd":"status"}
  {"cmd":"load","model":"...","device":"auto|gpu|cpu"}
  {"cmd":"tag","paths":["..."],"threshold":0.35,"rawtag":false,
   "exclude_tags":[],"additional_tags":[],"max_tags":0}
  {"cmd":"unload"}
  {"cmd":"quit"}

Responses (one JSON object per line on stdout):
  {"ok":true,"type":"pong"}
  {"ok":true,"type":"status", ...}
  {"ok":true,"type":"progress","current":1,"total":10,"path":"...","tags":[...],"scores":{...}}
  {"ok":true,"type":"done","count":10,"elapsed_ms":1234}
  {"ok":false,"error":"..."}
"""

from __future__ import annotations

import hashlib
import json
import sys
import time
import traceback
from pathlib import Path
from typing import Any

# Force unbuffered stdout for line protocol
sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
sys.stderr.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]


def emit(obj: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def log(msg: str) -> None:
    sys.stderr.write(msg + "\n")
    sys.stderr.flush()


# --- tagger root injection ---
TAGGER_ROOT = Path(__file__).resolve().parent.parent  # overridden by --tagger-root
_interrogators = None
_AbsInterrogator = None
_Image = None
_ImageFile = None
_MODEL_PINS: dict[str, Any] = {}

_state: dict[str, Any] = {
    "model_key": None,
    "device": None,
    "interrogator": None,
    "loaded": False,
    "providers": [],
    "cancel": False,
}


def _load_model_pins() -> dict[str, Any]:
    """Load models-pinned.json shipped next to this worker or under tagger root."""
    candidates = [
        Path(__file__).resolve().parent / "models-pinned.json",
        TAGGER_ROOT / "models-pinned.json",
        TAGGER_ROOT / "python" / "models-pinned.json",
    ]
    for p in candidates:
        try:
            if p.is_file():
                return json.loads(p.read_text(encoding="utf-8"))
        except Exception as e:
            log(f"models-pinned load failed ({p}): {e}")
    return {}


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def _verify_file_hash(path: Path, expected: str | None, label: str) -> None:
    if not expected:
        log(f"No pinned SHA-256 for {label}; skipping hash check")
        return
    got = _sha256_file(path)
    if got.lower() != expected.lower():
        raise RuntimeError(
            f"Model file hash mismatch for {label}\n"
            f" expected: {expected}\n got:      {got}"
        )
    log(f"SHA-256 OK: {label} ({got[:16]}…)")


def _patch_downloads_with_pins() -> None:
    """
    Force Hugging Face downloads to use pinned revision + verify SHA-256.
    Destination: default HF hub cache (~/.cache/huggingface/hub).
    """
    global _MODEL_PINS
    _MODEL_PINS = _load_model_pins()
    if not _MODEL_PINS:
        log("WARNING: models-pinned.json not found; model revision/hash pins disabled")
        return

    from huggingface_hub import hf_hub_download as _orig_hf_hub_download  # noqa: WPS433

    def pinned_hf_hub_download(*args: Any, **kwargs: Any) -> str:
        repo_id = kwargs.get("repo_id") or (args[0] if args else None)
        filename = kwargs.get("filename")
        if len(args) >= 2 and not filename:
            filename = args[1]

        pin_entry = None
        pin_key = None
        for key, meta in _MODEL_PINS.items():
            if meta.get("repo_id") == repo_id:
                pin_entry = meta
                pin_key = key
                break

        if pin_entry:
            rev = pin_entry.get("revision")
            if rev:
                kwargs["revision"] = rev
            log(
                f"HF download pinned: repo={repo_id} file={filename} "
                f"rev={(rev or '')[:12]} model={pin_key}"
            )

        path = _orig_hf_hub_download(*args, **kwargs)
        p = Path(path)

        if pin_entry and filename:
            files = pin_entry.get("files") or {}
            meta = files.get(filename) or {}
            expected = meta.get("sha256")
            _verify_file_hash(p, expected, f"{repo_id}/{filename}")

        return path

    # Monkey-patch modules that imported hf_hub_download by name
    import huggingface_hub as _hh  # noqa: WPS433

    _hh.hf_hub_download = pinned_hf_hub_download  # type: ignore[attr-defined]

    for mod_name in (
        "tagger.interrogator.waifudiffusioninterrogator",
        "tagger.interrogator.camietaggerinterrogator",
        "tagger.interrogator.mldanbooruinterrogator",
    ):
        try:
            mod = sys.modules.get(mod_name) or __import__(mod_name, fromlist=["*"])
            if hasattr(mod, "hf_hub_download"):
                setattr(mod, "hf_hub_download", pinned_hf_hub_download)
        except Exception as e:
            log(f"pin patch skip {mod_name}: {e}")

    log(f"Model pins active for {len(_MODEL_PINS)} curated model(s)")


def setup_tagger_root(root: Path) -> None:
    global TAGGER_ROOT, _interrogators, _AbsInterrogator, _Image, _ImageFile
    TAGGER_ROOT = root.resolve()
    if str(TAGGER_ROOT) not in sys.path:
        sys.path.insert(0, str(TAGGER_ROOT))

    from PIL import Image, ImageFile  # noqa: WPS433
    from tagger.interrogator.interrogator import AbsInterrogator  # noqa: WPS433
    from tagger.interrogators import interrogators  # noqa: WPS433

    ImageFile.LOAD_TRUNCATED_IMAGES = True
    _Image = Image
    _ImageFile = ImageFile
    _AbsInterrogator = AbsInterrogator
    _interrogators = interrogators

    try:
        _patch_downloads_with_pins()
    except Exception as e:
        log(f"Model pin setup failed: {e}")
        traceback.print_exc(file=sys.stderr)


def list_models() -> list[str]:
    if _interrogators is None:
        return []
    return list(_interrogators.keys())


def available_providers() -> list[str]:
    try:
        from onnxruntime import get_available_providers  # noqa: WPS433
        return list(get_available_providers())
    except Exception:
        return ["CPUExecutionProvider"]


def resolve_providers(device: str) -> list[str]:
    available = available_providers()
    device = (device or "auto").lower()

    if device == "cpu":
        return ["CPUExecutionProvider"]

    if device == "gpu":
        preferred = [
            "CUDAExecutionProvider",
            "TensorrtExecutionProvider",
            "DmlExecutionProvider",  # DirectML (Windows)
            "ROCMExecutionProvider",
            "CoreMLExecutionProvider",
        ]
        selected = [p for p in preferred if p in available]
        if not selected:
            raise RuntimeError(
                "GPU_PROVIDER_UNAVAILABLE: "
                "GPU用プロバイダがありません。"
                "プラグインの「インストール」タブで「GPU パッケージを入れる」を実行し、"
                "その後 Worker を再起動してください。"
                "（CPU版 onnxruntime のままです。"
                f" Available={available}）"
            )
        # Always keep CPU as fallback after GPU
        if "CPUExecutionProvider" in available:
            selected.append("CPUExecutionProvider")
        return selected

    # auto
    optimal = [
        "CoreMLExecutionProvider",
        "CUDAExecutionProvider",
        "TensorrtExecutionProvider",
        "DmlExecutionProvider",
        "ROCMExecutionProvider",
        "CPUExecutionProvider",
    ]
    selected = [p for p in optimal if p in available]
    if not selected:
        selected = ["CPUExecutionProvider"]
    return selected


def unload_model() -> None:
    inter = _state.get("interrogator")
    if inter is not None:
        try:
            inter.unload()
        except Exception:
            pass
    _state["interrogator"] = None
    _state["model_key"] = None
    _state["device"] = None
    _state["loaded"] = False
    _state["providers"] = []


def load_model(model_key: str, device: str = "auto") -> None:
    if _interrogators is None or _AbsInterrogator is None:
        raise RuntimeError("Tagger root not initialized")

    if model_key not in _interrogators:
        raise RuntimeError(
            f"Unknown model: {model_key}. Available: {list(_interrogators.keys())}"
        )

    # Reload if model/device changed
    if (
        _state["loaded"]
        and _state["model_key"] == model_key
        and _state["device"] == device
    ):
        return

    unload_model()

    inter = _interrogators[model_key]
    providers = resolve_providers(device)
    inter.set_providers(providers)
    if device == "cpu":
        inter.use_cpu()

    # Force load now (downloads model if needed)
    log(f"Loading model={model_key} device={device} providers={providers}")
    # Open a 1x1 image path is not needed — call load() if available
    if hasattr(inter, "load"):
        inter.load()
    else:
        # fallback: interrogate dummy
        img = _Image.new("RGB", (64, 64), (128, 128, 128))
        inter.interrogate(img)

    _state["interrogator"] = inter
    _state["model_key"] = model_key
    _state["device"] = device
    _state["loaded"] = True
    _state["providers"] = providers
    log(f"Model ready: {model_key}")


def interrogate_path(
    image_path: Path,
    threshold: float,
    rawtag: bool,
    exclude_tags: set[str],
    additional_tags: list[str],
    max_tags: int,
) -> tuple[list[str], dict[str, float]]:
    inter = _state["interrogator"]
    if inter is None:
        raise RuntimeError("Model not loaded")

    im = _Image.open(image_path)
    try:
        result = inter.interrogate(im)
    finally:
        im.close()

    tags_dict = _AbsInterrogator.postprocess_tags(
        result[1],
        threshold=threshold,
        escape_tag=not rawtag,
        replace_underscore=not rawtag,
        exclude_tags=exclude_tags,
        additional_tags=additional_tags,
    )

    # sort by score desc (postprocess already does this unless alpha sort)
    items = list(tags_dict.items())
    if max_tags and max_tags > 0:
        items = items[:max_tags]

    tags = [t for t, _ in items]
    scores = {t: float(s) for t, s in items}
    return tags, scores


def handle_tag(msg: dict[str, Any]) -> None:
    model = msg.get("model") or _state.get("model_key") or "wd14-convnextv2.v1"
    device = msg.get("device") or _state.get("device") or "auto"
    load_model(model, device)

    paths = msg.get("paths") or []
    if not paths:
        emit({"ok": False, "error": "No paths provided"})
        return

    threshold = float(msg.get("threshold", 0.35))
    rawtag = bool(msg.get("rawtag", False))
    max_tags = int(msg.get("max_tags", 0) or 0)
    exclude = set(msg.get("exclude_tags") or [])
    additional = list(msg.get("additional_tags") or [])

    # reverse-escape exclude variants (space <-> underscore)
    exclude_expanded: set[str] = set()
    for t in exclude:
        t = t.strip()
        if not t:
            continue
        exclude_expanded.add(t)
        exclude_expanded.add(t.replace(" ", "_"))
        exclude_expanded.add(t.replace("_", " "))

    total = len(paths)
    t0 = time.perf_counter()
    ok_count = 0
    _state["cancel"] = False
    cancelled = False

    for i, p in enumerate(paths, start=1):
        if _state.get("cancel"):
            cancelled = True
            log(f"Cancelled at {i - 1}/{total}")
            break

        path = Path(p)
        try:
            if not path.is_file():
                emit({
                    "ok": False,
                    "type": "progress",
                    "current": i,
                    "total": total,
                    "path": str(path),
                    "error": "File not found",
                })
                continue

            tags, scores = interrogate_path(
                path, threshold, rawtag, exclude_expanded, additional, max_tags
            )
            # re-check after long inference
            if _state.get("cancel"):
                cancelled = True
                log(f"Cancelled after image {i}/{total}")
                break

            ok_count += 1
            emit({
                "ok": True,
                "type": "progress",
                "current": i,
                "total": total,
                "path": str(path),
                "tags": tags,
                "scores": scores,
            })
        except Exception as e:
            emit({
                "ok": False,
                "type": "progress",
                "current": i,
                "total": total,
                "path": str(path),
                "error": str(e),
            })
            log(traceback.format_exc())

    elapsed_ms = int((time.perf_counter() - t0) * 1000)
    emit({
        "ok": True,
        "type": "done",
        "count": ok_count,
        "total": total,
        "elapsed_ms": elapsed_ms,
        "cancelled": cancelled,
    })
    _state["cancel"] = False


def handle_message(msg: dict[str, Any]) -> bool:
    """Return False to quit."""
    cmd = (msg.get("cmd") or "").lower()

    if cmd == "ping":
        emit({"ok": True, "type": "pong"})
        return True

    if cmd == "cancel":
        _state["cancel"] = True
        emit({"ok": True, "type": "cancel_ack"})
        return True

    if cmd == "status":
        emit({
            "ok": True,
            "type": "status",
            "loaded": _state["loaded"],
            "model": _state["model_key"],
            "device": _state["device"],
            "providers": _state["providers"],
            "available_providers": available_providers(),
            "models": list_models(),
            "tagger_root": str(TAGGER_ROOT),
            "python": sys.executable,
            "version": sys.version,
        })
        return True

    if cmd == "load":
        try:
            model = msg.get("model") or "wd14-convnextv2.v1"
            device = msg.get("device") or "auto"
            load_model(model, device)
            emit({
                "ok": True,
                "type": "loaded",
                "model": _state["model_key"],
                "device": _state["device"],
                "providers": _state["providers"],
            })
        except Exception as e:
            emit({"ok": False, "error": str(e)})
            log(traceback.format_exc())
        return True

    if cmd == "tag":
        try:
            handle_tag(msg)
        except Exception as e:
            emit({"ok": False, "error": str(e)})
            log(traceback.format_exc())
        return True

    if cmd == "unload":
        unload_model()
        emit({"ok": True, "type": "unloaded"})
        return True

    if cmd in ("quit", "exit"):
        unload_model()
        emit({"ok": True, "type": "bye"})
        return False

    emit({"ok": False, "error": f"Unknown cmd: {cmd}"})
    return True


def main() -> int:
    import argparse

    parser = argparse.ArgumentParser(description="WD14 Eagle worker")
    parser.add_argument(
        "--tagger-root",
        required=True,
        help="Path to wd14-tagger-standalone root (contains tagger/ and run.py)",
    )
    parser.add_argument(
        "--model",
        default=None,
        help="Optional preload model key",
    )
    parser.add_argument(
        "--device",
        default="auto",
        choices=["auto", "gpu", "cpu"],
        help="Execution device",
    )
    args = parser.parse_args()

    root = Path(args.tagger_root)
    if not root.is_dir():
        emit({"ok": False, "error": f"tagger-root not found: {root}"})
        return 1
    if not (root / "tagger").is_dir():
        emit({"ok": False, "error": f"Invalid tagger-root (no tagger/): {root}"})
        return 1

    try:
        setup_tagger_root(root)
    except Exception as e:
        emit({"ok": False, "error": f"Failed to import tagger: {e}"})
        log(traceback.format_exc())
        return 1

    emit({
        "ok": True,
        "type": "ready",
        "models": list_models(),
        "available_providers": available_providers(),
        "tagger_root": str(TAGGER_ROOT),
        "python": sys.executable,
    })

    if args.model:
        try:
            load_model(args.model, args.device)
            emit({
                "ok": True,
                "type": "loaded",
                "model": _state["model_key"],
                "device": _state["device"],
                "providers": _state["providers"],
            })
        except Exception as e:
            emit({"ok": False, "error": f"Preload failed: {e}"})
            log(traceback.format_exc())

    # Main loop: JSON lines on stdin
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            msg = json.loads(line)
        except json.JSONDecodeError as e:
            emit({"ok": False, "error": f"Invalid JSON: {e}"})
            continue
        try:
            cont = handle_message(msg)
        except Exception as e:
            emit({"ok": False, "error": str(e)})
            log(traceback.format_exc())
            cont = True
        if not cont:
            break

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
