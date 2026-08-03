# Changelog

All notable changes to **Tagia** are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/).  
Versioning follows [Semantic Versioning](https://semver.org/).

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

## Community “What’s new” (paste-ready) — v1.4.4

### English

```
v1.4.4 — Platform gate and install consent (proactive review hardening)

- Full setup gated to Windows x64 + CPython 3.10; manifest platform/arch match.
- Install shows an explicit consent dialog (system Python may remain; HF model download on first use; images stay local).
- Reviewer notes and pre-submit checklist added for supply-chain clarity.
```

### 日本語

```
v1.4.4 — 対応環境の強制とインストール同意（審査先回り）

- 完全セットアップを Windows x64 + CPython 3.10 に限定（manifest も一致）。
- インストール前に影響説明ダイアログ（Python 残存、初回 HF モデル取得、画像はローカル）。
- 審査者向けノートと提出前チェックリストを追加。
```

### 简体中文

```
v1.4.4 — 平台限制与安装确认（主动对齐审核）

- 完整安装限定 Windows x64 + CPython 3.10，manifest 与文案一致。
- 安装前明确确认（可能保留系统 Python、首次从 HF 下载模型、图像留在本机）。
- 增加审核说明与提交前检查清单。
```

### 繁體中文

```
v1.4.4 — 平台限制與安裝確認（主動對齊審核）

- 完整安裝限定 Windows x64 + CPython 3.10，manifest 與文案一致。
- 安裝前明確確認（可能保留系統 Python、首次自 HF 下載模型、圖像留在本機）。
- 增加審核說明與提交前檢查清單。
```
