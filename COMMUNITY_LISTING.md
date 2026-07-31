# Tagia — Eagle Community listing copy (v1.4.2)

**Uninstall:** only Tagia-owned engine directory.  
**Does not remove:** system Python (including Python installed by Tagia setup), HF model caches.

---

## English

**Name:** Tagia

**Description:** Batch-generate tags for selected Eagle images with local AI in CPU, GPU, or Auto mode.

**Introduction:**

Tagia is a local AI batch image-tagging plugin for Eagle. Select images, a model, and CPU, GPU, or Auto device mode to start a batch. It processes the currently selected images, appends or replaces tags, can keep the model loaded between batches, and updates only the Tagia block in the Note field.

**Setup & dependencies**

- The plugin ships the full source of a fixed engine snapshot (`vendor/wd14-tagger-standalone`, commit pinned) for review. Install copies that snapshot into a Tagia-owned directory.
- Python packages are installed with `pip install --require-hashes` from a lock file that pins every recursive dependency and wheel SHA-256 (Windows x86_64 / CPython 3.10). Unconstrained `pip install --upgrade pip` is not used.
- **Windows only:** if no working Python is found, Tagia may install Python **3.10.11** via winget (`Python.Python.3.10`, source `winget`, exact version) or download the official python.org installer (HTTPS, SHA-256, Authenticode) and run it. **Uninstalling Tagia does not remove that Python installation**; only the Tagia-owned engine folder is deleted.
- On first use of a model, weights download from Hugging Face Hub at a **pinned repository revision** with **file SHA-256 verification** (see `python/models-pinned.json`). Cache location: `~/.cache/huggingface/hub`. Image inference then runs locally; no cloud tagging API key is required.

**Changelog (short):** v1.4.2 — hash-locked pip deps; bundled engine source; pinned model revisions/hashes; winget exact version; disclose Windows Python install remains after uninstall.

---

## 日本語

**名前:** Tagia

**説明:** Eagle で選択した画像を、ローカル AI で一括タグ付け（CPU / GPU / Auto）。

**紹介文:**

Tagia は Eagle 向けのローカル AI 一括画像タグ付けプラグインです。画像・モデル・CPU / GPU / Auto を選んでバッチ実行できます。既存タグへの追加/置換、モデル常駐、メモ欄の Tagia ブロックのみ更新に対応します。

**セットアップ**

- 固定 commit のエンジンソース全文を `vendor/wd14-tagger-standalone` に同梱。インストール時に Tagia 所有フォルダへコピーします。
- Python 依存は **全推移依存 + wheel SHA-256** を含むロックファイルで `pip install --require-hashes` します。無制限の `pip install --upgrade pip` は使いません。
- **Windows:** 利用可能な Python が無い場合、winget（`Python.Python.3.10` / **正確なバージョン 3.10.11** / source `winget`）または公式 python.org インストーラ（HTTPS・SHA-256・Authenticode）で Python を導入することがあります。**Tagia をアンインストールしても、この Python は削除されずシステムに残ります。** 削除されるのは Tagia 所有のエンジンフォルダのみです。
- モデル初回利用時、Hugging Face から **固定 revision** のファイルを取得し **SHA-256 検証** します（`python/models-pinned.json`）。保存先は `~/.cache/huggingface/hub`。推論はローカルです。

---

## 简体中文

**名称:** Tagia

**描述:** 使用本地 AI 为 Eagle 中选中的图像批量生成标签，支持 CPU、GPU 和 Auto 模式。

**简介:**

Tagia 是面向 Eagle 的本地 AI 批量图像打标签插件。选择图像、模型与 CPU / GPU / Auto 后即可批处理；支持追加或替换标签、保持模型加载，以及仅更新备注中的 Tagia 区块。

**安装说明**

- 插件内附带固定 commit 的完整引擎源码（`vendor/wd14-tagger-standalone`），安装时复制到 Tagia 拥有的目录。
- Python 依赖通过包含**全部递归依赖与 wheel SHA-256** 的锁文件，以 `pip install --require-hashes` 安装；不使用无约束的 `pip install --upgrade pip`。
- **Windows：** 若未检测到可用 Python，Tagia 可能通过 winget（`Python.Python.3.10`，**精确版本 3.10.11**，源 `winget`）或官方 python.org 安装包（HTTPS、SHA-256、Authenticode）安装 Python。**卸载 Tagia 不会删除该 Python**，仅删除 Tagia 拥有的引擎目录。
- 首次使用模型时，从 Hugging Face 按**固定 revision** 下载并校验 **SHA-256**（见 `python/models-pinned.json`），缓存于 `~/.cache/huggingface/hub`。推理在本地完成。

---

## 繁體中文

**名稱:** Tagia

**描述:** 使用本機 AI 為 Eagle 所選圖像批次產生標籤，支援 CPU、GPU 與 Auto 模式。

**簡介:**

Tagia 是面向 Eagle 的本機 AI 批次圖像標籤外掛。選擇圖像、模型與 CPU / GPU / Auto 後即可批次處理；支援附加或取代標籤、維持模型載入，以及只更新備註中的 Tagia 區塊。

**安裝說明**

- 外掛內附固定 commit 的完整引擎原始碼（`vendor/wd14-tagger-standalone`），安裝時複製到 Tagia 擁有的目錄。
- Python 相依透過包含**全部遞迴相依與 wheel SHA-256** 的鎖定檔，以 `pip install --require-hashes` 安裝；不使用無限制的 `pip install --upgrade pip`。
- **Windows：** 若找不到可用 Python，Tagia 可能以 winget（`Python.Python.3.10`，**精確版本 3.10.11**，來源 `winget`）或官方 python.org 安裝程式（HTTPS、SHA-256、Authenticode）安裝 Python。**解除安裝 Tagia 不會刪除該 Python**，僅刪除 Tagia 擁有的引擎目錄。
- 首次使用模型時，自 Hugging Face 以**固定 revision** 下載並驗證 **SHA-256**（見 `python/models-pinned.json`），快取於 `~/.cache/huggingface/hub`。推論在本機完成。
