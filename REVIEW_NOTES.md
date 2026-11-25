# Tagia — notes for Eagle reviewers (v1.4.14)

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

Icon correction (v1.4.13, 2026-10-16): redesigned in Figma with reference to the official Eagle plugin icon template. The manifest's `logo.png` is a 128×128 PNG with an opaque square background, visible padding, a blue tag silhouette, and a simplified white AI sparkle. Inspect at 128, 64, and 32 pixels. Editable source: https://www.figma.com/design/f0fxSKSAVhKJFLoxXpXygs?node-id=2-16 . No icon backups or extra plugin archives were added to the project folder.

Note preservation correction (v1.4.12, 2026-10-03): `mergeAnnotationSafe()` no longer trims any existing Note content. Test Notes with first-line indentation, two Markdown trailing spaces, multiple final newlines, and whitespace-only content; add a Tagia block and confirm the original content remains byte-for-byte identical. Existing blocks are replaced without modifying the text before or after them. Source regression tests also check both batch tag-write modes and the saved annotation.

Restore confirmation correction (2026-09-17): all five UI languages explicitly disclose the affected item count, overwrite of current tags, loss of tag edits made after the snapshot, and no undo. Confirm separately with the restore button; Cancel remains the default and Enter cancels. To verify, replace tags, add a manual tag, then open Restore: cancel must preserve the manual tag; confirming restore replaces it with the snapshot tags as warned.

1. Install the packaged `.eagleplugin` on **Windows x64**.
2. Open Tagia → Install → confirm the impact dialog → Install all (CPU).
3. Select an image in Eagle → Tag tab → Tag selected images (first run may download a pinned model).
4. Confirm tags appear on the item; optional Note block `<!-- Tagia -->`.
5. Uninstall from Install tab: only the Tagia-owned engine path is listed; two confirmations; type folder name; Cancel default; system Python remains.
6. Tag tab: Append / Replace radios. Replace shows count + no-undo text + snapshot restore.
7. Restore last replaced tags writes **tags only**. Sequence: replace → add/edit a note in Eagle → restore tags. The new note must survive. If a Tagia block exists, only that block is updated.
8. Settings → Browse a user engine: trust dialog lists `tagia-runtime`; Install does not overwrite `run.py` / `tagger/`.

## Package hygiene

Release package should exclude: `.git/`, `venv/`, `_cover_backup/`, local caches.  
Source helpers under `tools/` are optional for reviewers; not required at runtime.

v1.4.12 updates the main registered Tagia project in place for direct packaging through Eagle. The old `Tagia-1.4.10-review-fix-20260917.zip` is removed from that project. The manifest/code version matches, and the main tree is checked for nested archives, runtime caches, and duplicate plugin copies. Save exported `.eagleplugin` files outside the main project folder.
