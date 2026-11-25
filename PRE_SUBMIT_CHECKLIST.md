# Tagia pre-submit checklist (for author)

Use before every Eagle Community upload. Based on [Review Criteria](https://developer.eagle.cool/plugin-api/plugin-review/criteria) (2026-07-21+).

## Package

- [ ] Package the main registered Tagia project directly with Eagle's **Pack Plugin** action; save the exported `.eagleplugin` outside this folder
- [ ] Main project: matching manifest/code version; no nested archives or duplicate plugin copies
- [ ] No `.git/`, `venv/`, `__pycache__/`, `*.pyc`, `_cover_backup/` (must not exist in the packaged tree), secrets, nested unrelated zips
- [ ] Check the main project's runtime directories for caches and unnecessary build output before packaging
- [ ] Open the `.eagleplugin`/zip and confirm **no** `python/__pycache__/`
- [ ] `manifest.json`: correct version, `devTools: false`, `platform`/`arch` match claims
- [ ] Install the `.eagleplugin` on a clean machine/profile and smoke-test Tag + Install

## Security claims vs code

- [ ] Run `node --test tools/annotation.test.cjs`: first-line indentation, Markdown trailing spaces, multiple final newlines, whitespace-only Notes, existing block boundaries, and batch saves preserve all original Note content

- [ ] Install only uses hash-locked requirements (`--require-hashes`)
- [ ] No unconstrained `pip install --upgrade pip`
- [ ] Models: only `models-pinned.json` allowlist; no legacy unpinned UI options
- [ ] Uninstall: ownership marker only; no shared HF cache deletion; two confirmations; type folder name; Cancel default; Enter does not delete
- [ ] Replace mode: radio (not checkbox), fail-closed confirm with count, snapshot + restore
- [ ] Restore last replaced tags writes **tags only** (never whole-note overwrite; Tagia block only if already present)
- [ ] In all five languages, restore confirmation states item count, current-tag overwrite, loss of edits after the snapshot, and no undo; Cancel is focused by default, and Enter cancels.
- [ ] User-managed engine: no in-place venv/file overwrite; `tagia-runtime` subdirectory only
- [ ] winget / Python installer: exact version + verification paths unchanged
- [ ] Listing matches behavior (Python install persists, HF first download + **shared cache retained**, Windows-only)

## Store listing (each of en / ja / zh_CN / zh_TW)

- [ ] **Plugin Website:** `https://github.com/issonokoto/Tagia` or empty — never `xxxx` / bare `https://`
- [ ] Platform: **Windows x86_64 + CPython 3.10 only**
- [ ] Network: **first-use** model download from Hugging Face; local inference after
- [ ] Uninstall retains **shared HF model cache** + system Python; only Tagia-owned engine removed
- [ ] Destructive scope: uninstall = Tagia-owned engine only; Python not removed
- [ ] Changelog describes this version’s real changes (not “Update”)
- [ ] No claims for macOS/Linux one-click setup

## Visual assets

- [ ] Icon: `logo.png` is the current 128×128 Figma export; verify safe padding and legibility at 128, 64, and 32 pixels

- [ ] Covers ≥ 1560×1040
- [ ] Little text; large title + short tagline + ≤3 chips
- [ ] zh-CN: “标签” not missing glyphs (open cover and zoom)
- [ ] reCAPTCHA may block Featured Image upload — complete challenge if stuck at 100%

## Reviewer aids

- [ ] `REVIEW_NOTES.md` present and accurate for this version
- [ ] `SECURITY.md` / `COMMUNITY_LISTING.md` version bump if behavior changed
