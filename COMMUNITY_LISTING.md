# Tagia — Eagle Community listing copy (v1.4.0)

Use this when resubmitting. Git is **not** required (engine is a pinned ZIP).

**Changelog / What’s new:** paste from `CHANGELOG.md` → section “Community What’s new”.

---

## English

**Name:** Tagia

**Description:** Batch-tag selected Eagle images with local AI using CPU, GPU, or Auto device mode.

**Introduction:**

Tagia is a local AI batch image-tagging plugin for Eagle. Select images in Eagle, choose a model and device mode, and generate tags as a batch.

**Key features**

- Processes the images currently selected in Eagle.
- Appends generated tags to existing tags or replaces them.
- Can keep the model loaded while the panel is open to avoid reloading it between consecutive batches.
- Optionally writes tags to the Note field. It replaces only an existing `<!-- Tagia -->` block or appends a new block when none exists, preserving other note content.
- Provides panel controls for installing a **pinned** engine snapshot and dependencies, switching between CPU and GPU runtimes, and uninstalling only the engine directory that Tagia created (ownership marker).

**How to use**

1. Set up the engine and dependencies from the Install panel.
2. Select images in Eagle.
3. Choose a model, CPU, GPU, or Auto device mode, and tagging options, then start the batch.

**Requirements**

- Python 3.10 or later (the panel can detect Python and, on Windows, install it from the official Python.org installer with SHA-256 and Authenticode verification when needed).
- **Git is not required.** The panel downloads a pinned engine archive (fixed commit + SHA-256), not a live `git clone` of the default branch.
- An internet connection is required to install the engine and dependencies and to download the selected model from Hugging Face on first use.
- GPU mode requires a compatible NVIDIA GPU, CUDA 12.x, and matching cuDNN. CPU and Auto modes are also available.

**Privacy**

After the engine, dependencies, and required model have been downloaded, image-tagging inference can run locally without an internet connection or cloud API key.

---

## 日本語

**名前:** Tagia

**説明:** Eagle で選択した画像を、ローカル AI で一括タグ付け（CPU / GPU / Auto）。

**紹介文:**

Tagia は Eagle 向けのローカル AI 一括画像タグ付けプラグインです。画像を選択し、モデルとデバイスを選んでバッチでタグを生成します。

**主な機能**

- Eagle で選択中の画像を処理
- 既存タグへの追加、または置換
- パネル表示中はモデル常駐（連続バッチで再読込を削減）
- メモ欄への安全書き込み（`<!-- Tagia -->` ブロックのみ更新）
- パネルから **固定コミットのエンジン** と依存関係の導入、CPU/GPU 切替、**Tagia が作成したフォルダのみ** のアンインストール

**使い方**

1. インストールタブでエンジンと依存関係をセットアップ
2. Eagle で画像を選択
3. モデル・デバイス・オプションを選んで実行

**要件**

- Python 3.10 以降（Windows では必要時に公式インストーラを SHA-256 / Authenticode 検証のうえ取得可能）
- **Git は不要**です。デフォルトブランチの `git clone` は行わず、固定コミットのアーカイブを SHA-256 検証して展開します。
- 初回のエンジン・依存関係・モデル取得にはインターネット接続が必要
- GPU 利用時は対応 NVIDIA GPU・CUDA 12.x・対応 cuDNN。CPU / Auto も利用可

**プライバシー**

エンジン・依存関係・モデル取得後は、クラウド API キーなしでローカル推論できます。

---

## 简体中文

**名称:** Tagia

**描述:** 使用本地 AI 批量标记 Eagle 中选中的图像（CPU / GPU / Auto）。

**简介:**

Tagia 是面向 Eagle 的本地 AI 批量图像打标签插件。在 Eagle 中选择图像，选择模型和设备模式，即可批量生成标签。

**主要功能**

- 处理 Eagle 当前选中的图像
- 追加到已有标签，或替换标签
- 面板打开时可保持模型加载，加快连续批处理
- 可选写入备注：仅更新 `<!-- Tagia -->` 区块，保留其他备注内容
- 面板内安装**固定版本**引擎与依赖、切换 CPU/GPU，且仅卸载 Tagia 创建并标记的目录

**使用方法**

1. 在“安装”面板完成引擎与依赖设置  
2. 在 Eagle 中选择图像  
3. 选择模型、设备与选项后开始批处理  

**要求**

- Python 3.10 或更高（Windows 上可在需要时从 Python.org 官方安装包安装，并校验 SHA-256 与 Authenticode）
- **不需要 Git。** 不会对默认分支执行 `git clone`，而是下载固定 commit 的归档并校验 SHA-256。
- 首次安装引擎/依赖以及从 Hugging Face 下载模型需要网络
- GPU 模式需要兼容的 NVIDIA GPU、CUDA 12.x 与对应 cuDNN；也提供 CPU / Auto

**隐私**

引擎、依赖与模型下载完成后，可在本地完成推理，无需云端 API 密钥。

---

## 繁體中文

**名稱:** Tagia

**描述:** 使用本機 AI 批次標記 Eagle 所選圖像（CPU / GPU / Auto）。

**簡介:**

Tagia 是 Eagle 的本機 AI 批次圖像標籤外掛。在 Eagle 選取圖像、選擇模型與裝置模式後，即可批次產生標籤。

**主要功能**

- 處理 Eagle 目前選取的圖像
- 附加到既有標籤，或取代標籤
- 面板開啟時可維持模型載入，加快連續批次
- 可選寫入備註：僅更新 `<!-- Tagia -->` 區塊，保留其他備註
- 面板內安裝**固定版本**引擎與相依套件、切換 CPU/GPU，且僅解除安裝 Tagia 建立並標記的目錄

**使用方式**

1. 在「安裝」面板完成引擎與相依設定  
2. 在 Eagle 選取圖像  
3. 選擇模型、裝置與選項後開始批次  

**需求**

- Python 3.10 以上（Windows 可在需要時從 Python.org 官方安裝程式安裝，並驗證 SHA-256 與 Authenticode）
- **不需要 Git。** 不會對預設分支執行 `git clone`，而是下載固定 commit 的封存檔並驗證 SHA-256。
- 首次安裝引擎／相依套件，以及從 Hugging Face 下載模型需要網路
- GPU 模式需相容 NVIDIA GPU、CUDA 12.x 與對應 cuDNN；亦提供 CPU / Auto

**隱私**

引擎、相依套件與模型下載完成後，可在本機推論，無需雲端 API 金鑰。
