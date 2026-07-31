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

## Community “What’s new” (paste-ready) — v1.4.1

### English

```
v1.4.1 — Uninstall safety and marketplace assets (Community re-review)

- Uninstall removes only the Tagia-owned engine directory (ownership marker + recorded path).
- Removed Hugging Face model-cache deletion; shared ~/.cache/huggingface is never scanned or deleted.
- Store listing text updated in all locales to match this uninstall scope.
- Marketplace covers simplified for card readability (name, short tagline, three chips).
```

### 日本語

```
v1.4.1 — アンインストール安全性とカバー画像（Community 再審査対応）

- アンインストールは Tagia 所有のエンジンフォルダのみ削除（所有マーカー＋記録パス）。
- Hugging Face モデルキャッシュ削除機能を削除。共有の ~/.cache/huggingface は走査・削除しません。
- 申請文を全言語でこの削除範囲に合わせて更新。
- マーケットプレイス用カバーを簡素化（名前・短い一文・チップ3つ）。
```

### 简体中文

```
v1.4.1 — 卸载安全与商店封面（Community 复审）

- 卸载仅删除 Tagia 拥有的引擎目录（所有权标记 + 记录路径）。
- 已移除 Hugging Face 模型缓存删除；不会扫描或删除共享的 ~/.cache/huggingface。
- 各语言上架文案已与卸载范围一致。
- 商店封面简化（名称、一句说明、三个标签）。
```

### 繁體中文

```
v1.4.1 — 解除安裝安全性與商店封面（Community 複審）

- 解除安裝僅刪除 Tagia 擁有的引擎目錄（擁有權標記 + 記錄路徑）。
- 已移除 Hugging Face 模型快取刪除；不會掃描或刪除共享的 ~/.cache/huggingface。
- 各語言上架文案已與解除安裝範圍一致。
- 商店封面簡化（名稱、一句說明、三個標籤）。
```
