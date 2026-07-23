# Tagia (Eagle Plugin) v1.4.0

Local AI image tagging for [Eagle](https://eagle.cool/).  
Engine snapshot: [corkborg/wd14-tagger-standalone](https://github.com/corkborg/wd14-tagger-standalone) (pinned commit; product name is **Tagia**).

**Author:** [issonokoto](https://github.com/issonokoto)  
**License:** MIT (plugin code) — see [LICENSE](./LICENSE)

## Features

- Multi-image batch tagging
- Model keep-alive while the panel is open (faster consecutive runs)
- GPU / CPU / Auto device selection
- Install, GPU switch, and uninstall from the panel
- i18n: English, Japanese, Simplified Chinese, Traditional Chinese, Korean

## Security (install / uninstall)

- **No Git.** First-time engine install downloads a **pinned commit ZIP** from `codeload.github.com` and verifies **SHA-256** before extract.
- Python packages are installed from a **version list pinned in this plugin** (`python/requirements-tagia-pinned.txt` / in-code list), not from a mutable remote default branch.
- Windows Python fallback: official `python.org` installer only over **HTTPS**, host allowlist, redirect cap, random temp file, **SHA-256** + **Authenticode** checks before run.
- Uninstall recursively deletes **only** directories Tagia created: ownership marker (`.tagia-owned.json` with plugin id + version) **and** recorded `ownedInstallPath`. User-supplied engine folders are never deleted.

Pinned engine (v1.4.0):

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
