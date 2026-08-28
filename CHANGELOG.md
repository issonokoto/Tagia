# Changelog

All notable changes to **Tagia** are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/).  
Versioning follows [Semantic Versioning](https://semver.org/).

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

## Community “What’s new” (paste-ready) — v1.4.8

### English

```
v1.4.8 — Ownership / trust / engine integrity (Community re-review)

- User-picked or existing engine folders are always user-managed: never set as ownedInstallPath and never write/refresh .tagia-owned.json for them.
- Uninstall recursive delete only when ownedInstallPath, trustedEngine.owned, on-disk ownership marker, and exact path all agree; rejects unsafe paths (drive roots, home, shallow paths, symlinks/junctions).
- Trust records a complete, deterministically ordered hash manifest of every importable engine .py plus plugin worker.py, and verifies it before each worker launch.
```

### 日本語

```
v1.4.8 — 所有権 / 信頼 / エンジン整合性（Community 再審査対応）

- フォルダ選択や既存エンジンは常にユーザー管理。ownedInstallPath にせず、.tagia-owned.json の作成・更新もしません。
- アンインストールの再帰削除は ownedInstallPath・trustedEngine.owned・ディスク上の所有マーカー・パス一致がすべて揃ったときのみ。危険なパス（ドライブ直下・ホーム・浅いパス・シンボリックリンク/ジャンクション）は拒否します。
- 信頼時にエンジン内の import 可能な全 .py とプラグイン worker.py の完全ハッシュマニフェストを記録し、ワーカー起動前に毎回検証します。
```

### 简体中文

```
v1.4.8 — 所有权 / 信任 / 引擎完整性（Community 复审）

- 通过文件夹选择或已有引擎目录一律视为用户自管：不会设为 ownedInstallPath，也不会为其写入/刷新 .tagia-owned.json。
- 卸载时仅在 ownedInstallPath、trustedEngine.owned、磁盘所有权标记与路径完全一致时才递归删除；拒绝不安全路径（盘符根、用户主目录、过浅路径、符号链接/联接）。
- 信任记录会保存引擎内全部可导入 .py 以及插件 worker.py 的完整有序哈希清单，并在每次启动 worker 前校验。
```

### 繁體中文

```
v1.4.8 — 所有權 / 信任 / 引擎完整性（Community 複審）

- 資料夾選擇或既有引擎目錄一律視為使用者自管：不會設為 ownedInstallPath，也不會為其寫入/更新 .tagia-owned.json。
- 解除安裝僅在 ownedInstallPath、trustedEngine.owned、磁碟所有權標記與路徑完全一致時才遞迴刪除；拒絕不安全路徑（磁碟機根目錄、家目錄、過淺路徑、符號連結/連接點）。
- 信任紀錄會保存引擎內全部可匯入 .py 以及外掛 worker.py 的完整有序雜湊清單，並在每次啟動 worker 前驗證。
```
