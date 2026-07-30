# Tagia — Eagle Community listing copy (v1.4.1)

Use this when resubmitting.

**Uninstall scope (matches code):** only the Tagia-owned engine directory (ownership marker + recorded path).  
**Does not** scan or delete Hugging Face model caches under `~/.cache/huggingface`.

---

## English

**Name:** Tagia

**Description:** Batch-generate tags for selected Eagle images with local AI in CPU, GPU, or Auto mode.

**Introduction:**

Tagia is a local AI batch image-tagging plugin for Eagle. Select images, a model, and CPU, GPU, or Auto device mode to start a batch.

It processes the currently selected Eagle images, appends or replaces tags, can keep the model loaded between batches, and updates only the Tagia block in the Note field (other note text is preserved).

The Install panel downloads an engine archive from a fixed commit and verifies its SHA-256 hash. Initial setup and first model download require an internet connection; after that, image inference runs through a local Python worker with no cloud API key.

Uninstall removes only the Tagia-owned engine directory that Tagia created and marked (ownership marker + recorded path). It does not delete Hugging Face model caches (which may be shared with other tools), user-managed engine folders, or system Python. A confirmation dialog lists the exact engine path before deletion.

**Requirements:** Python 3.10+ · Internet for first setup and model download · Optional NVIDIA GPU + CUDA 12.x for GPU mode · Git is not required

---

## 日本語

**名前:** Tagia

**説明:** Eagle で選択した画像を、ローカル AI で一括タグ付け（CPU / GPU / Auto）。

**紹介文:**

Tagia は Eagle 向けのローカル AI 一括画像タグ付けプラグインです。画像・モデル・CPU / GPU / Auto を選んでバッチ実行できます。

選択中の画像を処理し、タグの追加または置換、連続実行時のモデル常駐、メモ欄の `<!-- Tagia -->` ブロックのみ更新（他のメモは保持）に対応します。

インストールパネルは固定 commit のエンジンをダウンロードし SHA-256 を検証します。初回セットアップとモデル取得にはネットが必要で、以降はローカル Python worker が推論します（クラウド API キー不要）。

アンインストールは、Tagia が作成・所有マーカーを付けたエンジンフォルダのみ削除します。Hugging Face のモデルキャッシュ（他ツールと共有されうる）、ユーザー管理のエンジン、システム Python は削除しません。削除前の確認ダイアログに対象パスを表示します。

**要件:** Python 3.10+ · 初回はネット · GPU 時は NVIDIA + CUDA 12.x · Git 不要

---

## 简体中文

**名称:** Tagia

**描述:** 使用本地 AI 为 Eagle 中选中的图像批量生成标签，支持 CPU、GPU 和 Auto 模式。

**简介:**

Tagia 是面向 Eagle 的本地 AI 批量图像打标签插件。选择图像、模型和 CPU、GPU 或 Auto 设备模式后，即可开始批处理。

主要功能包括处理 Eagle 当前选中的图像、追加或替换标签、在连续批次间保持模型加载，以及只更新备注中的 Tagia 区块（保留其他备注内容）。

安装面板会下载固定 commit 的引擎归档并校验 SHA-256；首次安装与模型下载需要网络，完成后由本地 Python worker 执行图像推理，无需云端 API 密钥。

卸载仅删除 Tagia 创建并带有所有权标记的引擎目录（所有权标记 + 记录路径）。不会扫描或删除 Hugging Face 模型缓存（可能位于引擎目录外并与其他工具共享）、用户自备引擎或系统 Python。删除前会在确认对话框中列出确切路径。

**要求:** Python 3.10+ · 首次需网络 · GPU 需 NVIDIA + CUDA 12.x · 不需要 Git

---

## 繁體中文

**名稱:** Tagia

**描述:** 使用本機 AI 為 Eagle 所選圖像批次產生標籤，支援 CPU、GPU 與 Auto 模式。

**簡介:**

Tagia 是面向 Eagle 的本機 AI 批次圖像標籤外掛。選擇圖像、模型與 CPU、GPU 或 Auto 裝置模式後，即可開始批次處理。

主要功能包括處理 Eagle 目前選取的圖像、附加或取代標籤、在連續批次間維持模型載入，以及只更新備註中的 Tagia 區塊（保留其他備註內容）。

安裝面板會下載固定 commit 的引擎封存並驗證 SHA-256；首次安裝與模型下載需要網路，完成後由本機 Python worker 執行圖像推論，無需雲端 API 金鑰。

解除安裝僅刪除 Tagia 建立並帶有擁有權標記的引擎目錄（擁有權標記 + 記錄路徑）。不會掃描或刪除 Hugging Face 模型快取（可能位於引擎目錄外並與其他工具共享）、使用者自備引擎或系統 Python。刪除前會在確認對話框列出確切路徑。

**需求:** Python 3.10+ · 首次需網路 · GPU 需 NVIDIA + CUDA 12.x · 不需要 Git
