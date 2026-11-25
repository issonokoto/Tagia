# Changelog

All notable changes to **Tagia** are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/).  
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [1.4.14] — 2026-11-25

### Fixed

- Batch tagging and tag restoration now share a lock from the first click through completion, including confirmation and snapshot access.
- Restoring an item with no original tags clears stale tag text inside its existing Tagia Note block.
- The restore log and notification show separate counts for restored items, missing items, and failures.

## [1.4.13] — 2026-10-16

### Changed

- Redesigned the plugin icon in Figma with reference to the official Eagle plugin icon template. The 128×128 PNG uses an opaque square background, visible padding, and a simplified blue tag/AI sparkle graphic that remains recognizable at smaller sizes.
- Updated the main project's `logo.png` directly. Editable design: https://www.figma.com/design/f0fxSKSAVhKJFLoxXpXygs?node-id=2-16 . Previous icon backups and export previews are stored outside the plugin folder.

## [1.4.12] — 2026-10-03

### Fixed

- Adding a Tagia block now preserves all original Note characters, including leading indentation, Markdown trailing spaces, multiple final newlines, and whitespace-only Notes. Only missing separator newlines are appended. Existing-block replacements insert tag text literally and preserve surrounding Note content.
- Added byte-for-byte Note regression tests covering both append and replace batch-save paths.

### Package

- Removed the older nested `Tagia-1.4.10-review-fix-20260917.zip` from the main plugin project. Updated the live project in place for packaging through Eagle, with matching manifest/code version and no old nested archives or duplicate plugin copies. Exported packages are saved outside this folder.

## [1.4.11] — 2026-09-17

### Security

- Restore confirmation in all five supported languages now explicitly states the affected item count, that the snapshot overwrites current tags, that later tag edits will be lost, and that the operation cannot be undone. The restore button uses destructive-action styling. Separate confirmation, default cancellation, and Enter-to-cancel are retained.

## [1.4.10] — 2026-09-07

### Security

- **Restore last replaced tags restores tags only.** It no longer assigns the snapshot’s old note to `item.annotation`. Later Eagle note edits survive. If a `<!-- Tagia -->` block already exists, only that block is updated to match the restored tags; all other note text is kept. New snapshots no longer store notes.

### Package

- Removed `_cover_backup/` from the plugin tree (unused duplicate covers). Historical files remain in git history, not in the release package.

---

## [1.4.9] — 2026-09-06

### Security

- **Append vs Replace:** mutually exclusive choices. Replace requires a fail-closed confirmation that shows the affected item count, states that all existing tags will be replaced, and that there is no reliable Eagle undo. Cancel is the default; Enter does not confirm. A verifiable SHA-256 snapshot of original tags (and notes) is saved first; **Restore last replaced tags** writes them back.
- **User-managed engines are not modified in place:** runtime files, venv, and packages live only in a Tagia-owned `tagia-runtime` subdirectory. Engine `run.py` / `tagger/` / existing root venv are never overwritten. If `tagia-runtime` exists and is not Tagia-owned, setup stops. CPU/GPU switching confirms and changes packages only inside that venv.
- **Uninstall:** every locale states that the entire listed directory is recursively and permanently deleted with no undo (no Recycle Bin). Two independent confirmations; the second requires typing the folder name. Cancel is focused by default; Enter / overlay click never delete.

### Changed

- Tag write mode is a radio group (Append / Replace) instead of an “Append” checkbox.
- Trust dialog lists the isolated runtime folder and the classes of files/packages that will be created there.

---

## [1.4.8] — 2026-08-19

### Security

- **User-picked / existing engines are never plugin-owned:** folder picker and existing directories always use user-managed trust; never set `ownedInstallPath` or write/refresh `.tagia-owned.json` for them.
- **Uninstall delete gate:** recursive delete only when `ownedInstallPath` (outside the target), `trustedEngine.owned === true`, on-disk marker, and exact path all agree; rejects drive roots, home, shallow paths, symlinks/junctions.
- **Complete engine Python integrity:** trust records a deterministically ordered hash manifest of every importable engine `.py` (plus plugin `worker.py`) and verifies it before every worker launch.

---

## [1.4.7] — 2026-08-05

### Security

- **No auto-adoption of engines:** `taggerRoot` defaults empty; common paths (`Documents/wd14-…`, `~/.grok/bin/…`, etc.) are never selected just because `run.py` + `tagger/` exist.
- **Startup check is filesystem-only:** soft env badge no longer executes candidate `venv` Python.
- **Explicit trust required before execution:** user-managed engines must be chosen via folder picker; full engine/Python paths are shown and trusted only after confirmation (fail-closed).
- **Tagia-owned engines:** require ownership marker; marker records and verifies hashes of `run.py`, `tagger/interrogators.py`, and plugin `worker.py`.
- Worker spawn uses only a trusted engine venv (never arbitrary discovered Pythons).

---

## [1.4.6] — 2026-08-04

### Security

- **Fail-closed consent:** `confirmInstallImpacts()` and the system-Python confirmation no longer continue when the dialog throws or returns no explicit continue/install response. Cancel and dialog failure both stop setup (no winget, python.org installer, pip, or other downloads).

---

## [1.4.5] — 2026-08-03

### Fixed (Community re-review)

- Exclude `python/__pycache__` and all `*.pyc` from release packages; strengthen `.gitignore`.
- English (and all-locale) store copy: first-use Hugging Face model download + shared cache retained after uninstall; follow reviewer’s suggested emphasis.
- Store **Plugin Website** must be `https://github.com/issonokoto/Tagia` (never placeholder `xxxx`).

---

## [1.4.4] — 2026-08-01

### Security / proactive hardening

- **Platform gate:** Install and GPU switch require **Windows x64**; clear error if not.
- **Install consent dialog** before setup (engine/venv, PyPI, optional system Python, HF models; images stay local).
- **Python 3.10 check:** Prefers / auto-installs CPython **3.10.x** for hash-locked wheels; confirms before auto-install.
- **manifest:** `platform: win`, `arch: x64` (matches listing).
- Added `REVIEW_NOTES.md` (for Eagle reviewers) and `PRE_SUBMIT_CHECKLIST.md` (author).

### Fixed

- Align code, manifest, and listing so platform claims cannot be misread as multi-OS.

---

## [1.4.3] — 2026-08-01

### Security

- **Strict model allowlist:** Worker loads/downloads only models fully defined in `models-pinned.json` (repo_id + revision + every required file SHA-256). Unpinned HF downloads are blocked (no default-branch fallback).
- Engine interrogators are filtered to the pin allowlist; unlisted engine models cannot be selected via the worker.
- **UI:** Legacy unpinned model settings are no longer kept in the menu; they migrate to the default pinned model with a user notification.

### Changed

- Store listing (en / ja / zh_CN / zh_TW) states clearly that full setup is **Windows x86_64 + CPython 3.10 only**.
- Regenerated Simplified Chinese cover with Microsoft YaHei so “标签” renders correctly.

### Fixed

- Eagle Community re-review: legacy model pin bypass, platform disclosure, zh-CN cover missing glyphs.

---

## [1.4.2] — 2026-08-01

### Security

- **Full hash-locked Python install:** `python/requirements-locked-win-amd64.txt` pins all recursive deps with wheel SHA-256; install uses `pip install --require-hashes`.
- **No unconstrained pip upgrade:** bootstrap uses `python/pip-pinned.txt` (pip 25.0.1 + hash only).
- **Bundled engine source:** complete snapshot under `vendor/wd14-tagger-standalone/` (commit `9818bcf4…`) for review; install copies from vendor.
- **winget:** only `Python.Python.3.10` **version 3.10.11** from source **`winget`**.
- **Models:** `python/models-pinned.json` pins HF `repo_id` + **revision** + file **SHA-256**; worker verifies after download.
- **GPU swap:** hash-locked `onnxruntime-gpu==1.20.2` via `requirements-locked-gpu-win-amd64.txt` (`--no-deps`).

### Changed

- Store listing (en/ja/zh-CN/zh-TW) discloses Windows may install Python and that **uninstall does not remove Python**.
- Added `SECURITY.md` documenting supply chain and data destinations.

### Fixed

- Eagle Community re-review: incomplete dependency/hash locks, engine source not in package, model pin gaps, Python persistence disclosure.

---

## [1.4.1] — 2026-07-30

### Security

- **Uninstall no longer touches Hugging Face caches.** Removed the “Also delete model cache” option and all scanning of `~/.cache/huggingface/hub` by name patterns. Uninstall deletes only Tagia-owned engine directories (ownership marker + recorded path).

### Changed

- Install / uninstall copy updated in all locales to state that shared model caches are never deleted.
- Marketplace covers simplified (plugin name, one tagline, three large chips; no dense feature list / footer).
- Community listing text rewritten to match uninstall behavior.

### Fixed

- Eagle Community re-review: shared HF cache deletion, listing/implementation mismatch, unreadable cover text.

---

## [1.4.0] — 2026-07-23

### Security

- **Pinned engine install (no live `git clone`)**  
  Downloads a fixed commit ZIP of `corkborg/wd14-tagger-standalone` and verifies **SHA-256** before extract.  
  - Commit: `9818bcf4c45b5bb08384b7ac6ba6c6126edc8335`  
  - ZIP SHA-256: `3fac85e6b30aa6035b5884d12e357ed684129175573913b175524b2161d156c0`
- **Pinned Python dependencies**  
  Installs packages from a version list shipped with the plugin (`requirements-tagia-pinned.txt` / in-code pins), not from a mutable remote default branch.
- **Safer Windows Python auto-install**  
  Official python.org installer only over HTTPS, host allowlist, redirect limit, random temp file, **SHA-256** and **Authenticode** verification before execution.
- **Safe uninstall boundaries**  
  Recursive delete only for directories Tagia created: ownership marker (`.tagia-owned.json` with plugin id + version) and recorded `ownedInstallPath`. User-supplied engine folders are never deleted.

### Changed

- Install flow no longer requires **Git** on PATH.
- Install / Settings copy updated in **en / ja / zh_CN / zh_TW / ko** to match the new flow.
- Community listing text documented in `COMMUNITY_LISTING.md`.

### Fixed

- Issues raised in Eagle Community review (code integrity of install, uninstall deletion scope, and install prerequisites disclosure).

---

## [1.3.1] — 2026-07-11

### Added

- Initial public Community submission package.
- Local AI batch tagging for selected Eagle images (CPU / GPU / Auto).
- Model keep-alive worker while the panel is open.
- Panel install: Python detect, engine setup, venv, dependency install, GPU/CPU runtime switch.
- Optional write of tags into Note as a safe `<!-- Tagia -->` block (other notes preserved).
- Multi-language UI: English, Japanese, Simplified Chinese, Traditional Chinese, Korean.
- Curated models: SwinV2 v3, ConvNeXt v3, EVA02 Large v3, Z3D/e621, Camie v2.

### Notes

- First Community review requested security and listing corrections → addressed in **1.4.0**.

---

## Community “What’s new” (paste-ready)

### English

```
- Batch tagging and tag restoration now run one at a time, including while confirmation is open.
- Restoring an item that originally had no tags now clears the old tags from its Tagia block in the Note.
- Restore results now show how many items were restored, how many could not be found, and how many failed.
```

### 日本語

```
- 確認画面の表示中も含め、一括タグ付けと復元の二重実行を防ぐようにしました。
- 元のタグが空だった項目を復元すると、メモのTagiaブロックに残っていたタグも消去されます。
- 復元結果に、成功した件数、項目が見つからなかった件数、処理に失敗した件数を個別に表示します。
```

### 简体中文

```
- 批量打标签和还原标签现在一次只能执行一项操作，等待确认时也不会重复启动。
- 还原原本没有标签的项目时，会清除备注中 Tagia 区块里残留的标签。
- 还原结果会分别显示还原成功、未找到和处理失败的项目数。
```

### 繁體中文

```
- 批次加上標籤和還原標籤現在一次只能執行一項操作，等待確認時也不會重複啟動。
- 還原原本沒有標籤的項目時，會清除備註中 Tagia 區塊裡殘留的標籤。
- 還原結果會分別顯示還原成功、找不到和處理失敗的項目數。
```
