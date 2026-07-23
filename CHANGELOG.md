# Changelog

All notable changes to **Tagia** are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/).  
Versioning follows [Semantic Versioning](https://semver.org/).

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

## Community “What’s new” (paste-ready) — v1.4.0

Submit each locale’s changelog using the block below.

### English

```
v1.4.0 — Security and install hardening (Community re-review)

- Engine is installed from a pinned GitHub commit archive with SHA-256 verification. Git is not required.
- Python packages are installed from versions pinned in the plugin package (not a mutable remote default branch).
- On Windows, the official Python.org installer is downloaded over HTTPS only, with host allowlist, redirect limits, SHA-256 check, and Authenticode verification before execution.
- Uninstall recursively deletes only Tagia-owned engine directories (ownership marker + recorded path). User-managed engine folders are never deleted. System Python is kept.
- Install panel copy and Community listing text updated to match the new flow (en / ja / zh-CN / zh-TW / ko).
```

### 日本語

```
v1.4.0 — セキュリティとインストールの改善（Community 再審査対応）

- エンジンは固定 commit のアーカイブを SHA-256 検証して導入します。Git は不要です。
- Python 依存関係は、プラグイン同梱の固定バージョンからインストールします（変更されうるデフォルトブランチの requirements は使いません）。
- Windows では公式 Python.org インストーラのみを HTTPS で取得し、許可ホスト・リダイレクト制限・SHA-256・Authenticode を確認してから実行します。
- アンインストールは Tagia が作成したエンジンフォルダのみ再帰削除します（所有マーカー＋記録パス一致）。ユーザー管理のエンジンは消しません。システム Python は残します。
- インストール画面の文言と Community 申請文を新フローに合わせて更新しました（英・日・簡中・繁中・韓）。
```

### 简体中文

```
v1.4.0 — 安全性与安装流程加固（Community 复审）

- 引擎改为下载固定 commit 的归档包，并在解压前校验 SHA-256。不需要 Git。
- Python 依赖使用插件内固定版本安装，不再依赖可变的远程默认分支 requirements。
- Windows 上仅从官方 Python.org 通过 HTTPS 下载安装包，限制主机与重定向次数，并在执行前校验 SHA-256 与 Authenticode。
- 卸载仅递归删除 Tagia 创建并标记的引擎目录（所有权标记 + 记录路径一致）。不会删除用户自备引擎。系统 Python 保留。
- 安装面板文案与 Community 上架说明已按新流程更新（英 / 日 / 简中 / 繁中 / 韩）。
```

### 繁體中文

```
v1.4.0 — 安全性與安裝流程強化（Community 複審）

- 引擎改為下載固定 commit 的封存檔，並在解壓前驗證 SHA-256。不需要 Git。
- Python 相依套件使用外掛內固定版本安裝，不再依賴可變的遠端預設分支 requirements。
- Windows 上僅從官方 Python.org 以 HTTPS 下載安裝程式，限制主機與重新導向次數，並在執行前驗證 SHA-256 與 Authenticode。
- 解除安裝僅遞迴刪除 Tagia 建立並標記的引擎目錄（擁有權標記 + 記錄路徑一致）。不會刪除使用者自備引擎。系統 Python 會保留。
- 安裝面板文案與 Community 上架說明已依新流程更新（英 / 日 / 簡中 / 繁中 / 韓）。
```
