# Changelog

All notable changes to **Tagia** are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/).  
Versioning follows [Semantic Versioning](https://semver.org/).

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

## Community “What’s new” (paste-ready) — v1.4.2

### English

```
v1.4.2 — Supply-chain locks and Python disclosure (Community re-review)

- Full recursive pip lock with wheel SHA-256; install uses pip --require-hashes (no free pip upgrade).
- Engine source for the fixed commit is bundled in the package (vendor/) for review.
- winget installs only Python.Python.3.10 version 3.10.11 from source winget (or verified python.org installer).
- Models use pinned Hugging Face revisions and file SHA-256 (models-pinned.json).
- Listing states Windows setup may install Python and that uninstalling Tagia does not remove that Python.
```

### 日本語

```
v1.4.2 — サプライチェーン固定と Python 開示（Community 再審査）

- 推移依存すべてを wheel SHA-256 でロックし pip --require-hashes で導入（無制限の pip upgrade なし）。
- 固定 commit のエンジンソース全文をパッケージに同梱（vendor/）。
- winget は Python.Python.3.10 の正確な 3.10.11（source winget）のみ（または検証済み公式インストーラ）。
- モデルは HF の固定 revision とファイル SHA-256（models-pinned.json）。
- 申請文に「Windows では Python を導入しうる／Tagia 削除後も Python は残る」を明記。
```

### 简体中文

```
v1.4.2 — 供应链锁定与 Python 说明（Community 复审）

- 全量递归依赖 wheel SHA-256 锁定，使用 pip --require-hashes（无自由 pip upgrade）。
- 固定 commit 的完整引擎源码随包提供（vendor/）。
- winget 仅安装 Python.Python.3.10 精确版本 3.10.11（源 winget），或经验证的官方安装包。
- 模型使用固定 Hugging Face revision 与文件 SHA-256。
- 上架文案说明：Windows 可能安装 Python，卸载 Tagia 不会删除该 Python。
```

### 繁體中文

```
v1.4.2 — 供應鏈鎖定與 Python 說明（Community 複審）

- 全量遞迴相依 wheel SHA-256 鎖定，使用 pip --require-hashes（無自由 pip upgrade）。
- 固定 commit 的完整引擎原始碼隨套件提供（vendor/）。
- winget 僅安裝 Python.Python.3.10 精確版本 3.10.11（來源 winget），或經驗證的官方安裝程式。
- 模型使用固定 Hugging Face revision 與檔案 SHA-256。
- 上架文案說明：Windows 可能安裝 Python，解除安裝 Tagia 不會刪除該 Python。
```
