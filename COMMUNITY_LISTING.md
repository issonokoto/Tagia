# Tagia — Eagle Community listing copy (v1.4.10)

**4 languages = same sections and same disclosures.**  
Paste only **Name / Description / Introduction** into each language tab.

**Plugin Website field (form only, not part of the introduction text):**  
`https://github.com/issonokoto/Tagia`  
Leave empty if you prefer — never use placeholders like `xxxx` or bare `https://`.

---

## English

**Name:** Tagia

**Description:** Batch-generate tags for selected Eagle images with local AI in CPU, GPU, or Auto mode.

**Introduction:**

Tagia is a local AI batch image-tagging plugin for Eagle. It processes the currently selected images, can append tags or (after a fail-closed confirmation with item count, snapshot, and restore) replace tags, keep the model loaded between consecutive batches, and update only the Tagia block in the Note field while preserving other notes. Restoring a replacement writes tags only and does not overwrite the whole note. User-managed engines are not modified in place: Tagia stores venv and packages in a Tagia-owned `tagia-runtime` subdirectory. Uninstall recursively and permanently deletes only that Tagia-owned directory after two confirmations (including typing the folder name); Cancel is the default.

Complete setup and the core workflow require **Windows x86_64 with CPython 3.10**. Dependency install uses a hash-locked wheel set (`requirements-locked-win-amd64.txt`). **macOS and Linux are not supported** for one-click setup in this release.

The package ships a fixed engine source snapshot under `vendor/wd14-tagger-standalone` (pinned commit). Install copies it into a Tagia-owned directory. Python packages install with `pip install --require-hashes`. Only models listed in `models-pinned.json` (repository, revision, and every required file SHA-256) can be downloaded or loaded; legacy unpinned settings migrate to a supported model.

**The first time a selected model is used, Tagia downloads fixed-revision model files from Hugging Face Hub, verifies their SHA-256 hashes, and stores them in the shared Hugging Face cache** (`~/.cache/huggingface/hub`). Image inference then runs **locally**; image bytes are not sent to a Tagia cloud API.

**Windows only:** if no working CPython 3.10 is found, Tagia may install Python **3.10.11** via winget (`Python.Python.3.10`, exact version, source `winget`) or the official python.org installer (HTTPS, SHA-256, Authenticode).

**Uninstalling Tagia removes only Tagia-owned engine directories** and retains the **shared Hugging Face model cache**, system Python installations (including Python installed during setup), and user-managed engines.

**How to use:** Install tab → confirm impact dialog → Install all (CPU) → select images in Eagle → Tag selected images.

---

## 日本語

**名前:** Tagia

**説明:** Eagle で選択した画像を、ローカル AI で一括タグ付け（CPU / GPU / Auto）。

**紹介文:**

Tagia は Eagle 向けのローカル AI 一括画像タグ付けプラグインです。選択中の画像を処理し、タグの追加、または（件数表示・スナップショット・復元付きの確認後に）置き換え、連続実行時のモデル常駐、メモ欄の Tagia ブロックのみ更新（他のメモは保持）に対応します。ユーザー管理エンジンは直接変更せず、venv とパッケージは Tagia 所有の `tagia-runtime` に置きます。アンインストールは Tagia 所有ディレクトリのみを再帰的かつ永続的に削除し、二重確認（フォルダ名入力）とキャンセル既定です。

一式セットアップとコアのタグ付けは **Windows x86_64 + CPython 3.10 のみ** 対応です。依存関係はハッシュ固定の wheel セット（`requirements-locked-win-amd64.txt`）を使います。**macOS / Linux のワンクリックセットアップは本リリースでは非対応**です。

固定 commit のエンジンソースを `vendor/wd14-tagger-standalone` に同梱し、インストール時に Tagia 所有フォルダへコピーします。Python 依存は `pip install --require-hashes` で導入します。モデルは `models-pinned.json` に完全定義（リポジトリ・revision・必要ファイルの SHA-256）されたものだけダウンロード／読込できます。未ピン留めの旧設定は対応モデルへ移行します。

**選択したモデルを初めて使うとき、Tagia は Hugging Face Hub から固定 revision のモデルファイルをダウンロードし、SHA-256 を検証したうえで共有 Hugging Face キャッシュ**（`~/.cache/huggingface/hub`）**に保存します。** 以降の画像推論は **ローカル** で行い、画像バイトを Tagia のクラウド API には送りません。

**Windows のみ:** 利用可能な CPython 3.10 が無い場合、winget（`Python.Python.3.10` / 正確なバージョン **3.10.11** / source `winget`）または公式 python.org インストーラ（HTTPS・SHA-256・Authenticode）で Python を導入することがあります。

**Tagia をアンインストールすると、Tagia 所有のエンジンフォルダのみ削除され、共有 Hugging Face モデルキャッシュ・システム Python（セットアップで入れた Python を含む）・ユーザー管理のエンジンは残ります。**

**使い方:** インストールタブ → 影響確認 → 一括インストール (CPU) → Eagle で画像選択 → タグ付け。

---

## 简体中文

**名称:** Tagia

**描述:** 使用本地 AI 为 Eagle 中选中的图像批量生成标签，支持 CPU、GPU 和 Auto 模式。

**简介:**

Tagia 是面向 Eagle 的本地 AI 批量图像打标签插件。它会处理当前选中的图像，支持追加标签，或在（显示数量、快照与还原的）确认之后替换标签、在连续批次间保持模型加载，以及仅更新备注中的 Tagia 区块（保留其他备注内容）。用户自备引擎不会被就地修改：venv 与软件包放在 Tagia 拥有的 `tagia-runtime` 子目录。卸载仅递归且永久删除该 Tagia 拥有目录，需两次确认（含输入文件夹名），默认取消。

完整安装与核心流程**仅支持 Windows x86_64 + CPython 3.10**。依赖使用哈希锁定的 wheel 集合（`requirements-locked-win-amd64.txt`）。**本版本不支持 macOS / Linux 的一键安装。**

插件内附固定 commit 引擎源码（`vendor/wd14-tagger-standalone`），安装时复制到 Tagia 拥有的目录。Python 依赖以 `pip install --require-hashes` 安装。仅允许 `models-pinned.json` 完整固定（仓库、revision、所需文件 SHA-256）的模型下载与加载；旧的未固定设置会迁移到支持的模型。

**首次使用所选模型时，Tagia 会从 Hugging Face Hub 下载固定 revision 的模型文件，校验 SHA-256，并保存到共享 Hugging Face 缓存**（`~/.cache/huggingface/hub`）。之后的图像推理在**本地**运行，不会将图像字节发送到 Tagia 云端 API。

**仅 Windows：** 若未找到可用的 CPython 3.10，Tagia 可能通过 winget（`Python.Python.3.10`、精确版本 **3.10.11**、源 `winget`）或官方 python.org 安装包（HTTPS、SHA-256、Authenticode）安装 Python。

**卸载 Tagia 仅删除 Tagia 拥有的引擎目录，并保留共享 Hugging Face 模型缓存、系统 Python（含安装过程中安装的 Python）以及用户自备引擎。**

**用法:** 安装页 → 确认说明 → 一键安装 (CPU) → 在 Eagle 选图 → 打标签。

---

## 繁體中文

**名稱:** Tagia

**描述:** 使用本機 AI 為 Eagle 所選圖像批次產生標籤，支援 CPU、GPU 與 Auto 模式。

**簡介:**

Tagia 是面向 Eagle 的本機 AI 批次圖像標籤外掛。它會處理目前選取的圖像，支援附加標籤，或在（顯示數量、快照與還原的）確認之後取代標籤、在連續批次間維持模型載入，以及只更新備註中的 Tagia 區塊（保留其他備註內容）。使用者自備引擎不會被就地修改：venv 與套件放在 Tagia 擁有的 `tagia-runtime` 子目錄。解除安裝僅遞迴且永久刪除該 Tagia 擁有目錄，需兩次確認（含輸入資料夾名稱），預設取消。

完整安裝與核心流程**僅支援 Windows x86_64 + CPython 3.10**。相依使用雜湊鎖定的 wheel 集合（`requirements-locked-win-amd64.txt`）。**本版本不支援 macOS / Linux 一鍵安裝。**

外掛內附固定 commit 引擎原始碼（`vendor/wd14-tagger-standalone`），安裝時複製到 Tagia 擁有的目錄。Python 相依以 `pip install --require-hashes` 安裝。僅允許 `models-pinned.json` 完整固定（儲存庫、revision、所需檔案 SHA-256）的模型下載與載入；舊的未固定設定會遷移至支援的模型。

**首次使用所選模型時，Tagia 會自 Hugging Face Hub 下載固定 revision 的模型檔案，驗證 SHA-256，並儲存至共享 Hugging Face 快取**（`~/.cache/huggingface/hub`）。之後的圖像推論在**本機**執行，不會將圖像位元組傳送到 Tagia 雲端 API。

**僅 Windows：** 若找不到可用的 CPython 3.10，Tagia 可能以 winget（`Python.Python.3.10`、精確版本 **3.10.11**、來源 `winget`）或官方 python.org 安裝程式（HTTPS、SHA-256、Authenticode）安裝 Python。

**解除安裝 Tagia 僅刪除 Tagia 擁有的引擎目錄，並保留共享 Hugging Face 模型快取、系統 Python（含安裝過程中安裝的 Python）以及使用者自備引擎。**

**用法:** 安裝頁 → 確認說明 → 一鍵安裝 (CPU) → 在 Eagle 選圖 → 打標籤。
