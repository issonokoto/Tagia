# Tagia security & supply-chain notes (v1.4.14)

## Engine (bundled)

- Upstream: `corkborg/wd14-tagger-standalone`
- Commit: `9818bcf4c45b5bb08384b7ac6ba6c6126edc8335`
- Full source is shipped under `vendor/wd14-tagger-standalone/` in this package for review.
- Install copies that snapshot into the Tagia-owned engine directory (no live `git clone` of a mutable branch).
- Optional network re-fetch of the same commit ZIP is SHA-256 verified:
  - `3fac85e6b30aa6035b5884d12e357ed684129175573913b175524b2161d156c0`

## Python packages

- Install uses `python/requirements-locked-win-amd64.txt` with **`pip install --require-hashes`**.
- All direct and transitive dependencies for Windows x86_64 / CPython 3.10 are pinned with wheel SHA-256.
- Unconstrained `pip install --upgrade pip` is **not** used. Bootstrap uses `python/pip-pinned.txt` (pip 25.0.1 + hash).
- GPU switch uses `python/requirements-locked-gpu-win-amd64.txt` (`onnxruntime-gpu==1.20.2` + hash, `--no-deps`).

## Windows Python auto-install

If no working Python is found, Tagia may:

1. **winget** (source `winget` only):  
   `Python.Python.3.10` **exact version 3.10.11**
2. Or download the official python.org Windows installer, verify **SHA-256** and **Authenticode**, then run it.

**Uninstall Tagia does not remove that system Python.** Only the Tagia-owned engine directory (or, for a user-managed engine, only the `tagia-runtime` subdirectory) is deleted — recursively and permanently, after two confirmations including typing the folder name.

## User-managed engines

Tagia does not write venv, `worker.py`, lock files, or pip packages into a user-picked engine root. Those live in `<engine>/tagia-runtime/` (Tagia-owned marker). The user engine (`run.py`, `tagger/`) is treated as read-only.

## Tag replacement

Note writes preserve the complete existing Note string, including indentation, Markdown trailing spaces, whitespace-only content, and final newlines. When no Tagia block exists, only missing separator newlines and the new block are appended. When a block exists, only that block is replaced; tag text is inserted literally. Regression tests cover both append and replace batch-save paths.

Replace mode requires an in-plugin confirmation (Cancel default; Enter does not confirm) and writes a SHA-256 snapshot of original tags for batch restore.

Restore has a separate confirmation in all five supported languages stating the affected item count, that current tags are overwritten by the snapshot, that later tag edits are lost, and that the operation cannot be undone. Cancel is the default; Enter cancels. Restore does not back up current tags or provide undo.

## Models (Hugging Face)

Curated models download on first use from Hugging Face Hub into the local HF cache  
(`~/.cache/huggingface/hub` by default).

Pins are in `python/models-pinned.json`:

| Tagia model key | repo_id | revision (git) |
|-----------------|---------|----------------|
| wd-v1-4-swinv2-tagger.v3 | SmilingWolf/wd-swinv2-tagger-v3 | see JSON |
| wd-v1-4-convnext-tagger.v3 | SmilingWolf/wd-convnext-tagger-v3 | see JSON |
| wd-eva02-large-tagger-v3 | SmilingWolf/wd-eva02-large-tagger-v3 | see JSON |
| z3d-e621-convnext-toynya | toynya/Z3D-E621-Convnext | see JSON |
| camie-tagger-v2 | Camais03/camie-tagger-v2 | see JSON |

Each listed model file has a documented SHA-256. The worker downloads with that **revision** and verifies hashes after download.  
**Unlisted models (including engine-defined keys not in this JSON) cannot be loaded or downloaded.** Legacy UI settings migrate to a pinned default.

### Data transmitted

- On first model load: HTTPS to `huggingface.co` / `cdn-lfs.huggingface.co` for the pinned files only.
- Tagging inference itself runs **locally**; image bytes are not uploaded to Tagia servers (none).
- No cloud API key is required for tagging.

## Uninstall scope

Deletes only directories with Tagia ownership marker (`.tagia-owned.json`) and matching recorded path (full Tagia-created engine, or `tagia-runtime` under a user-managed engine). Deletion is recursive and permanent (no Recycle Bin). Two fail-closed confirmations; the second requires typing the folder name. Cancel is the default; Enter does not delete.

Does **not** delete: system Python, Hugging Face caches, user-managed engine files (`run.py`, `tagger/`, user venv).
