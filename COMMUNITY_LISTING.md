# Tagia — Eagle Community listing copy (v1.4.3)

**Supported platform for full setup & core workflow:**  
**Windows x86_64 only · CPython 3.10 only**  
(macOS / Linux complete setup is not supported in this release.)

---

## English

**Name:** Tagia

**Description:** Batch-generate tags for selected Eagle images with local AI in CPU, GPU, or Auto mode.

**Introduction:**

Tagia is a local AI batch image-tagging plugin for Eagle. Select images, a model, and CPU, GPU, or Auto device mode to start a batch. It processes the currently selected images, appends or replaces tags, can keep the model loaded between batches, and updates only the Tagia block in the Note field.

**Platform (important)**

- Complete setup and the core tagging workflow are supported only on **Windows x86_64** with **CPython 3.10**.
- Dependency install always uses the hash-locked file for this platform (`requirements-locked-win-amd64.txt`). macOS and Linux are not supported for one-click setup in this release.

**Setup & security**

- Bundled fixed engine source under `vendor/wd14-tagger-standalone` (pinned commit).
- Python packages install with `pip install --require-hashes` (full recursive lock + wheel SHA-256).
- Only models listed in `models-pinned.json` (repo + revision + every required file SHA-256) can be downloaded or loaded. Legacy unpinned model settings are migrated to a supported model.
- On Windows, if Python is missing, Tagia may install **Python 3.10.11** via winget (exact id/version/source) or a verified python.org installer. **Uninstalling Tagia does not remove that Python.**

---

## 日本語

**名前:** Tagia

**説明:** Eagle で選択した画像を、ローカル AI で一括タグ付け（CPU / GPU / Auto）。

**紹介文:**

Tagia は Eagle 向けのローカル AI 一括画像タグ付けプラグインです。画像・モデル・CPU / GPU / Auto を選んでバッチ実行できます。

**対応環境（重要）**

- 一式セットアップとコアのタグ付けフローは **Windows x86_64 + CPython 3.10 のみ** 対応です。
- 依存関係は常にこの向けのハッシュ固定ファイル（`requirements-locked-win-amd64.txt`）を使います。**macOS / Linux のワンクリックセットアップは本リリースでは非対応**です。

**セットアップ**

- 固定 commit のエンジンソースを同梱。
- `pip install --require-hashes` で全推移依存を固定導入。
- ダウンロード／読込できるモデルは `models-pinned.json` に完全定義されたものだけ。未ピン留めの旧設定は対応モデルへ自動移行します。
- Windows で Python が無い場合、3.10.11 を導入することがあります。**Tagia 削除後も Python は残ります。**

---

## 简体中文

**名称:** Tagia

**描述:** 使用本地 AI 为 Eagle 中选中的图像批量生成标签，支持 CPU、GPU 和 Auto 模式。

**简介:**

Tagia 是面向 Eagle 的本地 AI 批量图像打标签插件。选择图像、模型与 CPU / GPU / Auto 后即可批处理。

**平台要求（重要）**

- 完整安装与核心打标签流程**仅支持 Windows x86_64 + CPython 3.10**。
- 依赖安装始终使用该平台的哈希锁定文件（`requirements-locked-win-amd64.txt`）。**本版本不支持 macOS / Linux 的一键安装。**

**安装与安全**

- 内附固定 commit 引擎源码；`pip install --require-hashes` 安装依赖。
- 仅允许 `models-pinned.json` 中完整固定（仓库、revision、所需文件 SHA-256）的模型下载与加载；旧的未固定模型设置会迁移到支持的模型。
- Windows 上若缺少 Python，可能安装 3.10.11；**卸载 Tagia 不会删除该 Python**。

---

## 繁體中文

**名稱:** Tagia

**描述:** 使用本機 AI 為 Eagle 所選圖像批次產生標籤，支援 CPU、GPU 與 Auto 模式。

**簡介:**

Tagia 是面向 Eagle 的本機 AI 批次圖像標籤外掛。選擇圖像、模型與 CPU / GPU / Auto 後即可批次處理。

**平台需求（重要）**

- 完整安裝與核心標籤流程**僅支援 Windows x86_64 + CPython 3.10**。
- 相依安裝一律使用此平台的雜湊鎖定檔（`requirements-locked-win-amd64.txt`）。**本版本不支援 macOS / Linux 一鍵安裝。**

**安裝與安全**

- 內附固定 commit 引擎原始碼；以 `pip install --require-hashes` 安裝相依。
- 僅允許 `models-pinned.json` 完整固定的模型下載與載入；舊的未固定模型設定會遷移至支援的模型。
- Windows 若缺少 Python，可能安裝 3.10.11；**解除安裝 Tagia 不會刪除該 Python**。
