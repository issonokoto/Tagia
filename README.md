# Tagia (Eagle Plugin) v1.4.8

Local AI image tagging for [Eagle](https://eagle.cool/).  
Engine snapshot: [corkborg/wd14-tagger-standalone](https://github.com/corkborg/wd14-tagger-standalone) (pinned commit; product name is **Tagia**).

**Author:** [issonokoto](https://github.com/issonokoto)  
**License:** MIT (plugin code) — see [LICENSE](./LICENSE)  

**Supported platform (full setup):** **Windows x86_64 · CPython 3.10 only**

## Features

- Multi-image batch tagging
- Model keep-alive while the panel is open (faster consecutive runs)
- GPU / CPU / Auto device selection
- Install, GPU switch, and uninstall from the panel
- i18n: English, Japanese, Simplified Chinese, Traditional Chinese, Korean

## Security (install / uninstall)

See [SECURITY.md](./SECURITY.md) for the full supply-chain notes.

- **Bundled engine source** at `vendor/wd14-tagger-standalone` (fixed commit) for review; install copies it into a Tagia-owned folder.
- Python deps: **`pip install --require-hashes`** with full recursive lock (`python/requirements-locked-win-amd64.txt`).
- pip itself: exact pin + hash (`python/pip-pinned.txt`) — no unconstrained `--upgrade pip`.
- Windows Python auto-install: winget **exact** `Python.Python.3.10` **3.10.11** / source `winget`, or verified python.org installer. **Uninstall does not remove Python.**
- Models: pinned HF revision + file SHA-256 (`python/models-pinned.json`).
- Uninstall deletes only Tagia-owned engine directories.

Pinned engine:

- Repo: `corkborg/wd14-tagger-standalone`
- Commit: `9818bcf4c45b5bb08384b7ac6ba6c6126edc8335`
- ZIP SHA-256: `3fac85e6b30aa6035b5884d12e357ed684129175573913b175524b2161d156c0`

## Usage

1. Load this folder as an Eagle plugin
2. Open **Tagia**
3. **Install** tab → setup (or point Settings to an existing engine folder)
4. Select images in Eagle → **Tag selected images**

## Languages

UI follows Eagle’s language (`Preferences → Common → Language`).  
Locale files: `_locales/en.json`, `ja_JP`, `zh_CN`, `zh_TW`, `ko_KR`.

Community store listing text (all four review locales): see `COMMUNITY_LISTING.md`.  
Release notes / changelog (required for updates): see `CHANGELOG.md`.

## Models (curated)

| UI label idea | Role |
|---------------|------|
| SwinV2 v3 | Recommended quality |
| ConvNeXt v3 | Faster / balanced |
| EVA02 Large v3 | Best quality, heavier |
| Z3D / e621 | Furry / anthro |
| Camie v2 | Alternate tagger family |

## License

Plugin code: free to use. Engine models and upstream tagger follow their own licenses.
