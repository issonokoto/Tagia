# Tagia — Eagle Community listing copy (v1.4.4)

All four locales below carry the **same disclosures** (platform, network, install side effects, models, uninstall).  
Paste each block into the matching language tab on the submission form.

**Supported platform for full setup & core workflow:**  
**Windows x86_64 only · CPython 3.10 only**  
(macOS / Linux complete setup is not supported in this release.)

---

## English

**Name:** Tagia

**Description:** Batch-generate tags for selected Eagle images with local AI in CPU, GPU, or Auto mode.

**Introduction:**

Tagia is a local AI batch image-tagging plugin for Eagle. Select images, a model, and CPU, GPU, or Auto device mode to start a batch. It processes the currently selected images, appends or replaces tags, can keep the model loaded between batches, and updates only the Tagia block in the Note field (other note text is preserved).

**Platform (important)**

- Complete setup and the core tagging workflow are supported only on **Windows x86_64** with **CPython 3.10**.
- Dependency install always uses the hash-locked file for this platform (`requirements-locked-win-amd64.txt`). **macOS and Linux are not supported** for one-click setup in this release.

**Setup & security**

- The package ships the full source of a fixed engine snapshot under `vendor/wd14-tagger-standalone` (pinned commit). Install copies that snapshot into a Tagia-owned directory.
- Python packages are installed with `pip install --require-hashes` from a lock file that pins every recursive dependency and wheel SHA-256. Unconstrained `pip install --upgrade pip` is not used.
- Only models listed in `models-pinned.json` (repository, revision, and every required file SHA-256) can be downloaded or loaded. Legacy unpinned model settings are migrated to a supported model.
- **Windows only:** if no working CPython 3.10 is found, Tagia may install **Python 3.10.11** via winget (`Python.Python.3.10`, exact version, source `winget`) or the official python.org installer (HTTPS, SHA-256, Authenticode). **Uninstalling Tagia does not remove that Python installation.**
- On first use of a model, weights download from Hugging Face Hub at a pinned revision (with hash verification) into the local cache (`~/.cache/huggingface/hub`). Image tagging inference then runs **locally**; image bytes are not sent to a Tagia cloud API.
- Uninstall removes only the Tagia-owned engine directory (ownership marker + recorded path). It does not delete Hugging Face caches, user-managed engines, or system Python.

**How to use**

1. Install tab → confirm the impact dialog → Install all (CPU). Optional: GPU package if you have NVIDIA + CUDA.
2. Select images in Eagle → choose model and options → Tag selected images.
3. Stop is available during a batch.

---

## 日本語

**名前:** Tagia

**説明:** Eagle で選択した画像を、ローカル AI で一括タグ付け（CPU / GPU / Auto）。

**紹介文:**

Tagia は Eagle 向けのローカル AI 一括画像タグ付けプラグインです。画像・モデル・CPU / GPU / Auto を選んでバッチ実行できます。選択中の画像を処理し、タグの追加または置換、連続実行時のモデル常駐、メモ欄の Tagia ブロックのみ更新（他のメモは保持）に対応します。

**対応環境（重要）**

- 一式セットアップとコアのタグ付けフローは **Windows x86_64 + CPython 3.10 のみ** 対応です。
- 依存関係は常にこの向けのハッシュ固定ファイル（`requirements-locked-win-amd64.txt`）を使います。**macOS / Linux のワンクリックセットアップは本リリースでは非対応**です。

**セットアップとセキュリティ**

- 固定 commit のエンジンソース全文を `vendor/wd14-tagger-standalone` に同梱します。インストール時に Tagia 所有フォルダへコピーします。
- Python 依存は、全推移依存と wheel の SHA-256 を含むロックファイルで `pip install --require-hashes` します。無制限の `pip install --upgrade pip` は使いません。
- ダウンロード／読込できるモデルは `models-pinned.json` に完全定義（リポジトリ・revision・必要ファイルの SHA-256）されたものだけです。未ピン留めの旧設定は対応モデルへ自動移行します。
- **Windows:** 利用可能な CPython 3.10 が無い場合、winget（`Python.Python.3.10` / 正確なバージョン **3.10.11** / source `winget`）または公式 python.org インストーラ（HTTPS・SHA-256・Authenticode）で Python を導入することがあります。**Tagia をアンインストールしても、この Python は削除されずシステムに残ります。**
- モデル初回利用時、Hugging Face Hub から固定 revision のファイルを取得し SHA-256 検証のうえ、ローカルキャッシュ（`~/.cache/huggingface/hub`）に保存します。以降のタグ付け推論は **ローカル** で行い、画像バイトを Tagia のクラウド API に送りません。
- アンインストールは Tagia 所有のエンジンフォルダのみ削除します（所有マーカー＋記録パス）。Hugging Face キャッシュ・ユーザー管理のエンジン・システム Python は削除しません。

**使い方**

1. インストールタブ → 影響説明を確認 → 一括インストール (CPU)。必要なら GPU パッケージ（NVIDIA + CUDA）。
2. Eagle で画像を選択 → モデルとオプションを選ぶ → 選択画像をタグ付け。
3. バッチ中は停止できます。

---

## 简体中文

**名称:** Tagia

**描述:** 使用本地 AI 为 Eagle 中选中的图像批量生成标签，支持 CPU、GPU 和 Auto 模式。

**简介:**

Tagia 是面向 Eagle 的本地 AI 批量图像打标签插件。选择图像、模型和 CPU / GPU / Auto 设备模式后即可开始批处理。它会处理当前选中的图像，支持追加或替换标签、在连续批次间保持模型加载，以及仅更新备注中的 Tagia 区块（保留其他备注内容）。

**平台要求（重要）**

- 完整安装与核心打标签流程**仅支持 Windows x86_64 + CPython 3.10**。
- 依赖安装始终使用该平台的哈希锁定文件（`requirements-locked-win-amd64.txt`）。**本版本不支持 macOS / Linux 的一键安装。**

**安装与安全**

- 插件内附带固定 commit 的完整引擎源码（`vendor/wd14-tagger-standalone`）。安装时会复制到 Tagia 拥有的目录。
- Python 依赖通过包含全部递归依赖与 wheel SHA-256 的锁文件，以 `pip install --require-hashes` 安装；不使用无约束的 `pip install --upgrade pip`。
- 仅允许 `models-pinned.json` 中完整固定（仓库、revision、所需文件 SHA-256）的模型下载与加载；旧的未固定模型设置会迁移到支持的模型。
- **仅 Windows：** 若未找到可用的 CPython 3.10，Tagia 可能通过 winget（`Python.Python.3.10`、精确版本 **3.10.11**、源 `winget`）或官方 python.org 安装包（HTTPS、SHA-256、Authenticode）安装 Python。**卸载 Tagia 不会删除该 Python 安装。**
- 首次使用模型时，会从 Hugging Face Hub 按固定 revision 下载文件并校验 SHA-256，保存到本地缓存（`~/.cache/huggingface/hub`）。之后的打标签推理在**本地**完成，不会将图像字节发送到 Tagia 云端 API。
- 卸载仅删除 Tagia 拥有的引擎目录（所有权标记 + 记录路径）。不会删除 Hugging Face 缓存、用户自备引擎或系统 Python。

**使用方法**

1. 打开“安装”页 → 确认影响说明 → 一键安装 (CPU)。如有 NVIDIA + CUDA，可再装 GPU 包。
2. 在 Eagle 中选择图像 → 选择模型与选项 → 为所选图像打标签。
3. 批处理过程中可停止。

---

## 繁體中文

**名稱:** Tagia

**描述:** 使用本機 AI 為 Eagle 所選圖像批次產生標籤，支援 CPU、GPU 與 Auto 模式。

**簡介:**

Tagia 是面向 Eagle 的本機 AI 批次圖像標籤外掛。選擇圖像、模型與 CPU / GPU / Auto 裝置模式後即可開始批次處理。它會處理目前選取的圖像，支援附加或取代標籤、在連續批次間維持模型載入，以及只更新備註中的 Tagia 區塊（保留其他備註內容）。

**平台需求（重要）**

- 完整安裝與核心標籤流程**僅支援 Windows x86_64 + CPython 3.10**。
- 相依安裝一律使用此平台的雜湊鎖定檔（`requirements-locked-win-amd64.txt`）。**本版本不支援 macOS / Linux 一鍵安裝。**

**安裝與安全**

- 外掛內附固定 commit 的完整引擎原始碼（`vendor/wd14-tagger-standalone`）。安裝時會複製到 Tagia 擁有的目錄。
- Python 相依透過包含全部遞迴相依與 wheel SHA-256 的鎖定檔，以 `pip install --require-hashes` 安裝；不使用無限制的 `pip install --upgrade pip`。
- 僅允許 `models-pinned.json` 中完整固定（儲存庫、revision、所需檔案 SHA-256）的模型下載與載入；舊的未固定模型設定會遷移至支援的模型。
- **僅 Windows：** 若找不到可用的 CPython 3.10，Tagia 可能以 winget（`Python.Python.3.10`、精確版本 **3.10.11**、來源 `winget`）或官方 python.org 安裝程式（HTTPS、SHA-256、Authenticode）安裝 Python。**解除安裝 Tagia 不會刪除該 Python 安裝。**
- 首次使用模型時，會自 Hugging Face Hub 依固定 revision 下載檔案並驗證 SHA-256，儲存至本機快取（`~/.cache/huggingface/hub`）。之後的標籤推論在**本機**完成，不會將圖像位元組傳送到 Tagia 雲端 API。
- 解除安裝僅刪除 Tagia 擁有的引擎目錄（擁有權標記 + 記錄路徑）。不會刪除 Hugging Face 快取、使用者自備引擎或系統 Python。

**使用方式**

1. 開啟「安裝」頁 → 確認影響說明 → 一鍵安裝 (CPU)。若有 NVIDIA + CUDA，可再安裝 GPU 套件。
2. 在 Eagle 選取圖像 → 選擇模型與選項 → 為所選圖像打標籤。
3. 批次處理過程中可停止。
