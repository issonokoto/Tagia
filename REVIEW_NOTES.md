# Tagia — notes for Eagle reviewers (v1.4.9)

## What this plugin does

Local AI batch tagging of **selected Eagle image items**. Inference runs on the user’s machine. No cloud tagging API.

## Supported platform (hard boundary)

| Item | Supported |
|------|-----------|
| OS | **Windows only** (`manifest.platform = win`) |
| CPU | **x64** (`manifest.arch = x64`) |
| Python | **CPython 3.10** (hash-locked wheels are win_amd64 / cp310) |
| macOS / Linux | **Not supported** for full setup in this release |

Install and GPU switch refuse other platforms with an in-UI explanation.

## Supply chain (high risk areas)

| Area | Control |
|------|---------|
| Engine | Full source in `vendor/wd14-tagger-standalone` (commit `9818bcf4…`). Install **copies** it into a Tagia-owned folder. |
| pip | `python/requirements-locked-win-amd64.txt` + `pip install --require-hashes`. No free `pip upgrade`. |
| pip bootstrap | `python/pip-pinned.txt` (exact version + SHA-256). |
| GPU package | `python/requirements-locked-gpu-win-amd64.txt` (`onnxruntime-gpu==1.20.2` + hash, `--no-deps`). |
| Models | Only keys in `python/models-pinned.json` (repo + revision + every required file SHA-256). Worker blocks unpinned HF downloads. |
| UI legacy models | Unpinned saved models are migrated to the default pinned model; not shown as selectable. |
| Windows Python | winget: `Python.Python.3.10` **3.10.11** source `winget`, or verified python.org installer. **Not removed on uninstall.** |
| Uninstall | Only Tagia-owned engine dir (ownership marker + recorded path). No HF cache wipe. |

## Network destinations

| When | Destination | Data |
|------|-------------|------|
| Install packages | PyPI (via pip) | Package wheels only |
| Optional engine ZIP fallback | `codeload.github.com` (pinned commit, SHA-256) | Engine archive |
| First model load | Hugging Face Hub (pinned revision) | Model/label files → `~/.cache/huggingface` |
| Tagging | Local only | Eagle item file paths on disk; image bytes not uploaded to Tagia servers |

## Suggested test steps

1. Install the packaged `.eagleplugin` on **Windows x64**.
2. Open Tagia → Install → confirm the impact dialog → Install all (CPU).
3. Select an image in Eagle → Tag tab → Tag selected images (first run may download a pinned model).
4. Confirm tags appear on the item; optional Note block `<!-- Tagia -->`.
5. Uninstall from Install tab: only the Tagia-owned engine path is listed; two confirmations; type folder name; Cancel default; system Python remains.
6. Tag tab: Append / Replace radios. Replace shows count + no-undo text + snapshot restore.
7. Settings → Browse a user engine: trust dialog lists `tagia-runtime`; Install does not overwrite `run.py` / `tagger/`.

## Package hygiene

Release package should exclude: `.git/`, `venv/`, `_cover_backup/`, local caches.  
Source helpers under `tools/` are optional for reviewers; not required at runtime.
