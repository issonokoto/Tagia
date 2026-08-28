/**
 * Tagia — Eagle Plugin
 * Local AI batch image tagging (model keep-alive worker).
 *
 * Security notes (Eagle review):
 * - Engine is fetched as a pinned commit ZIP + SHA-256 (no git / no default branch).
 * - Python deps are installed from a version list pinned in this package.
 * - Windows Python installer: HTTPS + host allowlist + redirect cap + SHA-256 + Authenticode.
 * - Recursive uninstall only for directories Tagia created (ownership marker + recorded path).
 */
(function () {
  'use strict';

  const fs = require('fs');
  const path = require('path');
  const crypto = require('crypto');
  const { spawn, execFile } = require('child_process');
  const os = require('os');
  const https = require('https');
  const { URL } = require('url');

  /** Must match manifest.json id / version */
  const PLUGIN_ID = 'c30c0fd0-df7a-4792-af3d-cf24674eba45';
  const PLUGIN_VERSION = '1.4.8';
  const OWNERSHIP_MARKER = '.tagia-owned.json';

  /**
   * Pinned engine snapshot (immutable).
   * Full source is bundled under vendor/wd14-tagger-standalone/ for review.
   * Optional network re-fetch uses the same commit ZIP + SHA-256.
   */
  const ENGINE_REPO = 'corkborg/wd14-tagger-standalone';
  const ENGINE_COMMIT = '9818bcf4c45b5bb08384b7ac6ba6c6126edc8335';
  const ENGINE_ZIP_URL =
    'https://codeload.github.com/corkborg/wd14-tagger-standalone/zip/' + ENGINE_COMMIT;
  const ENGINE_ZIP_SHA256 =
    '3fac85e6b30aa6035b5884d12e357ed684129175573913b175524b2161d156c0';

  /** Hash-locked pip install files (shipped with plugin) */
  const REQ_LOCKED_CPU = 'requirements-locked-win-amd64.txt';
  const REQ_LOCKED_GPU = 'requirements-locked-gpu-win-amd64.txt';
  const PIP_PINNED = 'pip-pinned.txt';
  const MODELS_PINNED = 'models-pinned.json';
  /** Bootstrap pip only (exact + hash). Never unconstrained --upgrade pip. */
  const PINNED_PIP_VERSION = '25.0.1';
  const PINNED_PIP_SHA256 =
    'c46efd13b6aa8279f33f2864459c8ce587ea6a1a59ee20de055868d8f7688f7f';

  /** Official CPython Windows installer (64-bit) — pinned + SHA-256 */
  const PYTHON_WIN_INSTALLER = {
    version: '3.10.11',
    url: 'https://www.python.org/ftp/python/3.10.11/python-3.10.11-amd64.exe',
    sha256: 'd8dede5005564b408ba50317108b765ed9c3c510342a598f9fd42681cbe0648b',
    /** Authenticode subject must contain this */
    signerContains: 'Python Software Foundation',
  };

  /** winget: explicit source + exact package version only */
  const WINGET_PYTHON = {
    id: 'Python.Python.3.10',
    version: '3.10.11',
    source: 'winget',
  };

  /** Hosts allowed for downloadFile (HTTPS only) */
  const DOWNLOAD_ALLOWED_HOSTS = new Set([
    'codeload.github.com',
    'github.com',
    'objects.githubusercontent.com',
    'www.python.org',
    'python.org',
  ]);
  const DOWNLOAD_MAX_REDIRECTS = 5;

  /** Curated models — key + i18n label key */
  const CURATED_MODELS = [
    { key: 'wd-v1-4-swinv2-tagger.v3', labelKey: 'models.swinv2' },
    { key: 'wd-v1-4-convnext-tagger.v3', labelKey: 'models.convnext' },
    { key: 'wd-eva02-large-tagger-v3', labelKey: 'models.eva02' },
    { key: 'z3d-e621-convnext-toynya', labelKey: 'models.z3d' },
    { key: 'camie-tagger-v2', labelKey: 'models.camie' },
  ];
  const DEFAULT_MODEL = 'wd-v1-4-swinv2-tagger.v3';
  const CURATED_KEYS = new Set(CURATED_MODELS.map((m) => m.key));
  const IMAGE_EXTS = new Set([
    'jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif', 'jfif', 'jpe', 'tif', 'tiff',
  ]);

  const CONFIG_KEY = 'tagia-config-v1';
  // migrate old config key once
  try {
    if (!localStorage.getItem(CONFIG_KEY)) {
      const old = localStorage.getItem('wd14-tagger-config-v1');
      if (old) localStorage.setItem(CONFIG_KEY, old);
    }
  } catch {}

  /**
   * Own i18n layer: Eagle's i18next often only loads the app locale and
   * changeLanguage() does not switch UI at runtime. We load _locales/*.json
   * ourselves so the language picker works.
   */
  const SUPPORTED_LANGS = ['en', 'ja_JP', 'zh_CN', 'zh_TW', 'ko_KR'];
  /** @type {Record<string, any>} */
  const localeCache = {};
  /** @type {Record<string, any>|null} */
  let activeCatalog = null;
  /** @type {Record<string, any>|null} */
  let fallbackCatalog = null;
  let activeLang = 'en';

  function getByPath(obj, key) {
    if (!obj || !key) return undefined;
    const parts = String(key).split('.');
    let cur = obj;
    for (const p of parts) {
      if (cur == null || typeof cur !== 'object') return undefined;
      cur = cur[p];
    }
    return cur;
  }

  function interpolate(str, opts) {
    if (!opts || typeof str !== 'string') return str;
    return str.replace(/\{\{(\w+)\}\}/g, (_, k) => (
      opts[k] != null ? String(opts[k]) : ''
    ));
  }

  function t(key, opts) {
    let val = getByPath(activeCatalog, key);
    if (val == null) val = getByPath(fallbackCatalog, key);
    // last resort: Eagle i18next (app language only)
    if (val == null) {
      try {
        if (typeof i18next !== 'undefined' && i18next.t) {
          const v = i18next.t(key, opts);
          if (v && v !== key) return v;
        }
      } catch {}
    }
    if (val == null) return key;
    if (typeof val === 'string') return interpolate(val, opts);
    return String(val);
  }

  function normalizeLangCode(code) {
    if (!code) return 'en';
    let c = String(code).replace(/-/g, '_');
    if (SUPPORTED_LANGS.includes(c)) return c;
    // Eagle sometimes uses "ja" / "zh_CN" etc.
    const lower = c.toLowerCase();
    if (lower.startsWith('ja')) return 'ja_JP';
    if (lower === 'zh_tw' || lower === 'zh_hk' || lower.includes('hant')) return 'zh_TW';
    if (lower.startsWith('zh')) return 'zh_CN';
    if (lower.startsWith('ko')) return 'ko_KR';
    if (lower.startsWith('en')) return 'en';
    // try match suffix
    for (const s of SUPPORTED_LANGS) {
      if (lower === s.toLowerCase()) return s;
    }
    return 'en';
  }

  function eagleLocale() {
    try {
      if (typeof eagle !== 'undefined' && eagle.app && eagle.app.locale) {
        return normalizeLangCode(eagle.app.locale);
      }
    } catch {}
    return 'en';
  }

  function resolveLanguage(pref) {
    if (!pref || pref === 'auto') return eagleLocale();
    return normalizeLangCode(pref);
  }

  function localesDir() {
    // pluginPath set on create; also try relative to this script
    if (pluginPath) return path.join(pluginPath, '_locales');
    try {
      return path.join(__dirname, '..', '_locales');
    } catch {
      return path.join(process.cwd(), '_locales');
    }
  }

  function loadLocaleFile(lang) {
    const code = normalizeLangCode(lang);
    if (localeCache[code]) return localeCache[code];
    const file = path.join(localesDir(), code + '.json');
    try {
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf8');
        localeCache[code] = JSON.parse(raw);
        return localeCache[code];
      }
    } catch (e) {
      try { console.warn('loadLocale failed', code, e); } catch {}
    }
    localeCache[code] = null;
    return null;
  }

  function setActiveLanguage(lang) {
    const code = normalizeLangCode(lang);
    activeLang = code;
    fallbackCatalog = loadLocaleFile('en') || {};
    activeCatalog = loadLocaleFile(code) || fallbackCatalog;
    try { document.documentElement.lang = code.replace('_', '-'); } catch {}
    return code;
  }

  /**
   * Apply preferred language (auto = Eagle), then refresh UI strings.
   * @returns {Promise<void>}
   */
  async function applyLanguage(pref) {
    const lng = resolveLanguage(pref);
    setActiveLanguage(lng);
    // Best-effort: also tell Eagle i18next (may no-op)
    try {
      if (typeof i18next !== 'undefined' && i18next.changeLanguage) {
        await Promise.resolve(i18next.changeLanguage(lng));
      }
    } catch {}
    applyI18n();
  }

  function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      const text = t(key);
      if (el.tagName === 'TITLE') {
        document.title = text;
      } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        // placeholders only via data-i18n-placeholder
      } else if (el.tagName === 'OPTION') {
        el.textContent = text;
      } else {
        el.textContent = text;
      }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) el.setAttribute('placeholder', t(key));
    });
    try {
      fillModels(null, $('modelSelect') && $('modelSelect').value);
    } catch {}
    // restore language preference after re-translating the Auto option label
    try {
      const ls = $('langSelect');
      if (ls) {
        const pref = ls.dataset.pref || 'auto';
        ls.value = pref;
      }
    } catch {}
    // status badge may still show old language — leave dynamic strings to callers
  }

  /** @type {import('child_process').ChildProcess | null} */
  let workerProc = null;
  /** Monotonic id so stale exit handlers cannot clobber a new worker */
  let workerToken = 0;
  let workerReady = false;
  let workerBuf = '';
  /** @type {Array<(msg:any)=>void>} */
  let pendingHandlers = [];
  let tagging = false;
  let stopRequested = false;
  let pluginPath = '';
  /** Eagle APIs (item/dialog/etc.) are only valid after onPluginCreate */
  let pluginReady = false;
  let runPending = false;
  let showPending = false;
  /** @type {any[]} */
  let selectedItems = [];

  const $ = (id) => document.getElementById(id);

  // ---------- config ----------
  function defaultConfig() {
    const home = os.homedir();
    // Do NOT auto-discover engines under common user-writable paths.
    // taggerRoot stays empty until Install creates an owned engine, or the user
    // explicitly picks a folder and confirms trust.
    return {
      taggerRoot: '',
      pythonPath: '',
      model: DEFAULT_MODEL,
      device: 'auto',
      threshold: 0.35,
      maxTags: 0,
      modeAppend: true,
      skipTagged: false,
      rawtag: false,
      keepWorker: true,
      writeAnnotation: true,
      excludeTags: '',
      additionalTags: '',
      installDir: path.join(home, 'Documents', 'wd14-tagger-standalone'),
      /** Exact path Tagia created (ownership); only this is recursive-uninstallable */
      ownedInstallPath: '',
      /**
       * Explicit trust record for the current engine (owned or user-managed).
       * { path, trustedAt, owned, hashes?: { runPy, interrogators, workerPlugin } }
       */
      trustedEngine: null,
      language: 'auto',
    };
  }

  function loadConfig() {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      if (!raw) return defaultConfig();
      const cfg = Object.assign(defaultConfig(), JSON.parse(raw));
      return sanitizeLoadedConfig(cfg);
    } catch {
      return defaultConfig();
    }
  }

  /**
   * Drop auto-adopted / untrusted engines so opening the plugin never executes
   * code from a merely layout-matching folder.
   */
  function sanitizeLoadedConfig(cfg) {
    const c = Object.assign(defaultConfig(), cfg || {});
    c.taggerRoot = (c.taggerRoot || '').trim();
    c.trustedEngine = c.trustedEngine || null;
    if (c.taggerRoot && !isEngineTrusted(c)) {
      // Keep path visible in Settings for re-trust, but do not treat as ready.
      // Soft badge / ensureWorker will refuse execution until confirmed.
      c.trustedEngine = null;
    }
    return c;
  }

  function saveConfig(cfg) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  }

  function readUiConfig() {
    const langEl = $('langSelect');
    // Preserve non-UI fields (ownership path, trust) from stored config
    let prev = {};
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      if (raw) prev = JSON.parse(raw) || {};
    } catch {}
    const taggerRoot = ($('taggerRoot').value || '').trim();
    let trustedEngine = prev.trustedEngine || null;
    // If UI path diverged from trusted record, trust is void until re-confirmed
    if (trustedEngine && taggerRoot && !samePath(trustedEngine.path, taggerRoot)) {
      trustedEngine = null;
    }
    if (!taggerRoot) trustedEngine = null;
    return {
      taggerRoot,
      pythonPath: ($('pythonPath').value || '').trim(),
      model: $('modelSelect').value,
      device: $('deviceSelect').value,
      threshold: parseFloat($('threshold').value) || 0.35,
      maxTags: parseInt($('maxTags').value, 10) || 0,
      modeAppend: $('modeAppend').checked,
      skipTagged: $('skipTagged').checked,
      rawtag: $('rawtag').checked,
      keepWorker: $('keepWorker').checked,
      writeAnnotation: $('writeAnnotation') ? $('writeAnnotation').checked : true,
      excludeTags: ($('excludeTags').value || '').trim(),
      additionalTags: ($('additionalTags').value || '').trim(),
      installDir: ($('installDir').value || '').trim(),
      ownedInstallPath: prev.ownedInstallPath || '',
      trustedEngine,
      language: (langEl && langEl.value) || 'auto',
    };
  }

  function applyConfigToUi(cfg) {
    $('taggerRoot').value = cfg.taggerRoot || '';
    $('pythonPath').value = cfg.pythonPath || '';
    $('deviceSelect').value = cfg.device || 'auto';
    $('threshold').value = String(cfg.threshold ?? 0.35);
    $('thresholdVal').textContent = Number(cfg.threshold ?? 0.35).toFixed(2);
    $('maxTags').value = String(cfg.maxTags ?? 0);
    $('modeAppend').checked = !!cfg.modeAppend;
    $('skipTagged').checked = !!cfg.skipTagged;
    $('rawtag').checked = !!cfg.rawtag;
    $('keepWorker').checked = cfg.keepWorker !== false;
    if ($('writeAnnotation')) {
      $('writeAnnotation').checked = cfg.writeAnnotation !== false;
    }
    $('excludeTags').value = cfg.excludeTags || '';
    $('additionalTags').value = cfg.additionalTags || '';
    $('installDir').value = cfg.installDir || defaultConfig().installDir;
    const lang = cfg.language || 'auto';
    if ($('langSelect')) {
      $('langSelect').value = lang;
      $('langSelect').dataset.pref = lang;
    }
    fillModels(null, cfg.model);
  }

  /**
   * Only show pinned/curated models (must match models-pinned.json allowlist).
   * Legacy unpinned selections are migrated to DEFAULT_MODEL — never kept in the UI.
   */
  let legacyModelNotified = false;
  function fillModels(_ignoredList, selected) {
    const sel = $('modelSelect');
    if (!sel) return;
    let cur = selected || sel.value || DEFAULT_MODEL;
    let migratedFrom = null;

    // migrate known renames
    if (cur === 'wd14-convnextv2.v1') {
      migratedFrom = cur;
      cur = DEFAULT_MODEL;
    }
    // drop any unpinned / legacy model key
    if (cur && !CURATED_KEYS.has(cur)) {
      migratedFrom = cur;
      cur = DEFAULT_MODEL;
    }

    sel.innerHTML = '';
    for (const m of CURATED_MODELS) {
      const opt = document.createElement('option');
      opt.value = m.key;
      opt.textContent = t(m.labelKey);
      if (m.key === cur) opt.selected = true;
      sel.appendChild(opt);
    }
    if (!sel.value && CURATED_MODELS.length) {
      sel.value = DEFAULT_MODEL;
      cur = DEFAULT_MODEL;
    }

    if (migratedFrom && !legacyModelNotified) {
      legacyModelNotified = true;
      try {
        const msg = t('models.migratedLegacy', { from: migratedFrom, to: cur });
        logMain(msg, 'warn');
        // persist migrated model into config
        const cfg = readUiConfig();
        cfg.model = cur;
        saveConfig(cfg);
        if (typeof eagle !== 'undefined' && eagle.notification) {
          eagle.notification.show({
            title: t('app.title'),
            body: msg,
            duration: 6000,
          });
        }
      } catch (e) {
        try { console.warn('legacy model migrate notify failed', e); } catch {}
      }
    }
  }

  // ---------- logging ----------
  function log(el, msg, cls) {
    if (!el) return;
    const line = document.createElement('div');
    if (cls) line.className = cls;
    const t = new Date().toLocaleTimeString();
    line.textContent = `[${t}] ${msg}`;
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
  }
  const logMain = (m, c) => log($('log'), m, c);
  const logInst = (m, c) => {
    log($('installLog'), m, c);
    // reflect latest activity in spinner detail while busy
    if (busyActive) {
      const short = String(m).replace(/\s+/g, ' ').trim();
      if (short) setBusy(null, short.length > 90 ? short.slice(0, 90) + '…' : short);
    }
  };

  function setBadge(state, textOrKey, isKey) {
    const b = $('statusBadge');
    b.className = 'badge ' + (state || '');
    const text = isKey ? t(textOrKey) : textOrKey;
    $('statusText').textContent = text;
  }

  function setProgress(cur, total, text, speed) {
    const pct = total > 0 ? Math.round((cur / total) * 100) : 0;
    $('progressFill').style.width = pct + '%';
    $('progressText').textContent = text || `${cur}/${total}`;
    $('progressSpeed').textContent = speed || '';
  }

  // ---------- busy spinner ----------
  let busyActive = false;
  let busyTimer = null;
  let busyStartedAt = 0;

  function formatElapsed(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    if (m <= 0) return r + 's';
    return m + 'm ' + String(r).padStart(2, '0') + 's';
  }

  function startBusy(title, detail) {
    busyActive = true;
    busyStartedAt = Date.now();
    const box = $('installBusy');
    if (box) box.classList.remove('hidden');
    if ($('busyTitle')) $('busyTitle').textContent = title || '処理中…';
    if ($('busyDetail')) $('busyDetail').textContent = detail || 'しばらくお待ちください';
    if ($('busyElapsed')) $('busyElapsed').textContent = '0s';
    if (busyTimer) clearInterval(busyTimer);
    busyTimer = setInterval(() => {
      if ($('busyElapsed')) {
        $('busyElapsed').textContent = formatElapsed(Date.now() - busyStartedAt);
      }
    }, 250);
    setInstallButtonsDisabled(true);
  }

  function setBusy(title, detail) {
    if (title != null && $('busyTitle')) $('busyTitle').textContent = title;
    if (detail != null && $('busyDetail')) $('busyDetail').textContent = detail;
  }

  function stopBusy() {
    busyActive = false;
    if (busyTimer) {
      clearInterval(busyTimer);
      busyTimer = null;
    }
    const box = $('installBusy');
    if (box) box.classList.add('hidden');
    setInstallButtonsDisabled(false);
  }

  function setInstallButtonsDisabled(disabled) {
    ['btnInstallAll', 'btnInstallGpu', 'btnInstallCpu', 'btnUninstall', 'btnBrowseInstall'].forEach((id) => {
      const el = $(id);
      if (el) el.disabled = !!disabled;
    });
  }

  function rmDirRecursive(dir) {
    if (!exists(dir)) return;
    // Node 14.14+ fs.rmSync
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      return;
    } catch {}
    // fallback
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) rmDirRecursive(p);
      else {
        try { fs.unlinkSync(p); } catch {}
      }
    }
    try { fs.rmdirSync(dir); } catch {}
  }

  function normPath(p) {
    try {
      const n = path.normalize(path.resolve(String(p || '')));
      return process.platform === 'win32' ? n.toLowerCase() : n;
    } catch {
      return '';
    }
  }

  function samePath(a, b) {
    return normPath(a) && normPath(a) === normPath(b);
  }

  function ownershipMarkerPath(root) {
    return path.join(root, OWNERSHIP_MARKER);
  }

  function sha256FileSync(filePath) {
    const hash = crypto.createHash('sha256');
    hash.update(fs.readFileSync(filePath));
    return hash.digest('hex');
  }

  function isSymlinkOrJunction(p) {
    try {
      const st = fs.lstatSync(p);
      if (st.isSymbolicLink()) return true;
      // Windows reparse points (junctions) — Node may expose as isSymbolicLink;
      // also reject if realpath differs from resolve for safety.
      const real = fs.realpathSync.native ? fs.realpathSync.native(p) : fs.realpathSync(p);
      if (normPath(real) !== normPath(path.resolve(p))) return true;
    } catch {
      return true;
    }
    return false;
  }

  /**
   * Deterministic list of every engine .py that can be imported (excl. venv / caches).
   * Paths use forward slashes and are sorted.
   */
  function listEnginePyRelativePaths(root) {
    const abs = path.resolve(root);
    const out = [];
    function walk(dir, relBase) {
      let entries;
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const ent of entries) {
        if (
          ent.name === 'venv' ||
          ent.name === '__pycache__' ||
          ent.name === '.git' ||
          ent.name === 'node_modules'
        ) {
          continue;
        }
        const full = path.join(dir, ent.name);
        if (isSymlinkOrJunction(full)) continue;
        const rel = (relBase ? relBase + '/' + ent.name : ent.name).replace(/\\/g, '/');
        let st;
        try {
          st = fs.lstatSync(full);
        } catch {
          continue;
        }
        if (st.isDirectory()) walk(full, rel);
        else if (st.isFile() && ent.name.endsWith('.py')) out.push(rel);
      }
    }
    walk(abs, '');
    out.sort();
    return out;
  }

  /** Complete py manifest: { files: {rel: sha256}, workerPlugin: sha256 } */
  function computeEnginePyManifest(root) {
    const abs = path.resolve(root);
    const files = {};
    for (const rel of listEnginePyRelativePaths(abs)) {
      const full = path.join(abs, ...rel.split('/'));
      files[rel] = sha256FileSync(full);
    }
    let workerPlugin = '';
    try {
      const wp = workerScript();
      if (exists(wp) && !isSymlinkOrJunction(wp)) workerPlugin = sha256FileSync(wp);
    } catch {}
    return { files, workerPlugin };
  }

  function verifyEnginePyManifest(root, expected) {
    if (!expected || !expected.files || typeof expected.files !== 'object') return false;
    let now;
    try {
      now = computeEnginePyManifest(root);
    } catch {
      return false;
    }
    const expKeys = Object.keys(expected.files).sort();
    const nowKeys = Object.keys(now.files).sort();
    if (expKeys.length === 0 || expKeys.length !== nowKeys.length) return false;
    for (let i = 0; i < expKeys.length; i++) {
      if (expKeys[i] !== nowKeys[i]) return false;
      if (expected.files[expKeys[i]] !== now.files[expKeys[i]]) return false;
    }
    if (expected.workerPlugin) {
      if (!now.workerPlugin || expected.workerPlugin !== now.workerPlugin) return false;
    }
    return true;
  }

  function readOwnershipMarker(root) {
    const marker = ownershipMarkerPath(root);
    if (!exists(marker)) return null;
    try {
      return JSON.parse(fs.readFileSync(marker, 'utf8'));
    } catch {
      return null;
    }
  }

  /** Only call for directories Tagia newly created in this install session. */
  function writeOwnershipMarker(root) {
    const abs = path.resolve(root);
    const pyManifest = computeEnginePyManifest(abs);
    const data = {
      pluginId: PLUGIN_ID,
      pluginVersion: PLUGIN_VERSION,
      engineRepo: ENGINE_REPO,
      engineCommit: ENGINE_COMMIT,
      installPath: abs,
      createdAt: new Date().toISOString(),
      pyManifest,
    };
    fs.writeFileSync(ownershipMarkerPath(abs), JSON.stringify(data, null, 2), 'utf8');
    return data;
  }

  /**
   * Marker presence alone is NOT ownership for uninstall.
   * Used only as one of several checks together with cfg.ownedInstallPath.
   */
  function markerClaimsPath(root) {
    if (!root || !exists(root)) return false;
    const data = readOwnershipMarker(root);
    if (!data || data.pluginId !== PLUGIN_ID) return false;
    if (!data.installPath) return false;
    return samePath(data.installPath, root);
  }

  /** @deprecated name kept for uninstall clarity — prefer canRecursivelyDeleteEngine */
  function isPluginOwnedDir(root) {
    return markerClaimsPath(root);
  }

  /**
   * Reject drive roots, user home, shallow paths, symlinks/junctions.
   */
  function isSafeUninstallTarget(absPath) {
    if (!absPath || !exists(absPath)) return false;
    const resolved = path.resolve(absPath);
    if (isSymlinkOrJunction(resolved)) return false;
    const parsed = path.parse(resolved);
    const root = parsed.root;
    if (!root) return false;
    if (samePath(resolved, root) || samePath(resolved + path.sep, root)) return false;
    const home = path.resolve(os.homedir());
    if (samePath(resolved, home)) return false;
    // Require enough depth: e.g. C:\Users\name\Documents\... (not C:\Users)
    const rel = path.relative(root, resolved);
    const depth = rel.split(path.sep).filter(Boolean).length;
    if (depth < 2) return false;
    // Must look like a tagger root (narrow target)
    if (!isTaggerRoot(resolved)) return false;
    return true;
  }

  /**
   * Uninstall delete gate: external ownedInstallPath + trustedEngine.owned +
   * on-disk marker + exact path + safety checks. Marker alone is never enough.
   */
  function canRecursivelyDeleteEngine(cfg, absPath) {
    const abs = path.resolve(absPath);
    if (!cfg || !cfg.ownedInstallPath) return false;
    if (!samePath(cfg.ownedInstallPath, abs)) return false;
    if (!cfg.trustedEngine || cfg.trustedEngine.owned !== true) return false;
    if (!samePath(cfg.trustedEngine.path, abs)) return false;
    if (!markerClaimsPath(abs)) return false;
    if (!isSafeUninstallTarget(abs)) return false;
    return true;
  }

  /**
   * Execution trust:
   * - Always requires trustedEngine for exact path + full py manifest verify
   * - owned:true also requires cfg.ownedInstallPath + marker agreement
   * - owned:false (user-managed / folder picker): never claims deletable ownership
   */
  function isEngineTrusted(cfg) {
    if (!cfg || !cfg.taggerRoot || !isTaggerRoot(cfg.taggerRoot)) return false;
    const abs = path.resolve(cfg.taggerRoot);
    const te = cfg.trustedEngine;
    if (!te || !te.path || !samePath(te.path, abs)) return false;
    if (!te.pyManifest || !verifyEnginePyManifest(abs, te.pyManifest)) return false;

    if (te.owned === true) {
      if (!cfg.ownedInstallPath || !samePath(cfg.ownedInstallPath, abs)) return false;
      if (!markerClaimsPath(abs)) return false;
      const data = readOwnershipMarker(abs);
      if (!data || !data.pyManifest) return false;
      if (!verifyEnginePyManifest(abs, data.pyManifest)) return false;
      return true;
    }

    // User-managed: explicit trust only; do not treat on-disk marker as ownership
    if (te.owned === false) return true;
    return false;
  }

  /**
   * Folder-picker / existing-directory trust. NEVER sets ownedInstallPath or writes marker.
   */
  function markUserManagedTrusted(cfg, enginePath) {
    const abs = path.resolve(enginePath);
    const pyManifest = computeEnginePyManifest(abs);
    cfg.taggerRoot = abs;
    cfg.trustedEngine = {
      path: abs,
      trustedAt: new Date().toISOString(),
      owned: false,
      pyManifest,
    };
    // Do not touch ownedInstallPath
    return cfg;
  }

  /**
   * Only for engines newly created by Tagia install in this session.
   */
  function markOwnedEngineTrusted(cfg, enginePath) {
    const abs = path.resolve(enginePath);
    const data = writeOwnershipMarker(abs);
    cfg.taggerRoot = abs;
    cfg.ownedInstallPath = abs;
    cfg.trustedEngine = {
      path: abs,
      trustedAt: new Date().toISOString(),
      owned: true,
      pyManifest: data.pyManifest,
    };
    return cfg;
  }

  function sha256File(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  function secureTempPath(prefix, ext) {
    const name = prefix + '-' + crypto.randomBytes(16).toString('hex') + (ext || '');
    return path.join(os.tmpdir(), name);
  }

  function isAllowedDownloadUrl(urlStr) {
    let u;
    try {
      u = new URL(urlStr);
    } catch {
      return false;
    }
    if (u.protocol !== 'https:') return false;
    const host = String(u.hostname || '').toLowerCase();
    return DOWNLOAD_ALLOWED_HOSTS.has(host);
  }

  function copyDirRecursive(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const ent of entries) {
      const s = path.join(src, ent.name);
      const d = path.join(dest, ent.name);
      if (ent.isDirectory()) copyDirRecursive(s, d);
      else fs.copyFileSync(s, d);
    }
  }

  // ---------- path helpers ----------
  function exists(p) {
    try { return !!(p && fs.existsSync(p)); } catch { return false; }
  }

  function isTaggerRoot(root) {
    return exists(path.join(root, 'run.py')) && exists(path.join(root, 'tagger'));
  }

  function venvPython(root) {
    if (process.platform === 'win32') {
      return path.join(root, 'venv', 'Scripts', 'python.exe');
    }
    return path.join(root, 'venv', 'bin', 'python');
  }

  function isWindowsStoreStub(p) {
    if (!p) return false;
    const n = String(p).toLowerCase().replace(/\//g, '\\');
    return n.includes('\\windowsapps\\') || n.includes('microsoft\\windowsapps');
  }

  function listPythonCandidates(cfg, opts) {
    const includeEngineVenv = !!(opts && opts.includeEngineVenv);
    const list = [];
    const push = (p) => {
      if (!p) return;
      const abs = path.normalize(p);
      if (!list.includes(abs)) list.push(abs);
    };

    if (cfg && cfg.pythonPath) push(cfg.pythonPath);
    // Never auto-probe venv python from an untrusted engine directory
    if (
      includeEngineVenv &&
      cfg &&
      cfg.taggerRoot &&
      isEngineTrusted(cfg)
    ) {
      push(venvPython(cfg.taggerRoot));
    }

    const home = os.homedir();
    if (process.platform === 'win32') {
      const local = path.join(home, 'AppData', 'Local', 'Programs', 'Python');
      // Prefer 3.10–3.12 (wd14-friendly)
      for (const ver of ['Python310', 'Python311', 'Python312', 'Python313', 'Python39']) {
        push(path.join(local, ver, 'python.exe'));
      }
      // Scan Local\Programs\Python\* for any install
      try {
        if (exists(local)) {
          for (const d of fs.readdirSync(local)) {
            push(path.join(local, d, 'python.exe'));
          }
        }
      } catch {}
      push('C:\\Python310\\python.exe');
      push('C:\\Python311\\python.exe');
      push('C:\\Python312\\python.exe');
      push(path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Python310', 'python.exe'));
      push(path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Python311', 'python.exe'));
    } else {
      push('/usr/bin/python3');
      push('/usr/local/bin/python3');
      push('/opt/homebrew/bin/python3');
    }
    return list;
  }

  /** @returns {Promise<{ok:boolean, path?:string, version?:string, error?:string}>} */
  function probePython(pyPath) {
    return new Promise((resolve) => {
      if (!pyPath || isWindowsStoreStub(pyPath)) {
        return resolve({ ok: false, error: 'store-stub' });
      }
      if (!exists(pyPath) && path.isAbsolute(pyPath)) {
        return resolve({ ok: false, error: 'missing' });
      }
      const child = spawn(pyPath, ['-c', 'import sys; print(sys.version); print(sys.executable)'], {
        windowsHide: true,
        env: Object.assign({}, process.env, {
          PYTHONUTF8: '1',
          PYTHONIOENCODING: 'utf-8',
        }),
      });
      let out = '';
      let err = '';
      child.stdout.on('data', (d) => { out += d.toString('utf8'); });
      child.stderr.on('data', (d) => { err += d.toString('utf8'); });
      const timer = setTimeout(() => {
        try { child.kill(); } catch {}
        resolve({ ok: false, error: 'timeout' });
      }, 8000);
      child.on('error', (e) => {
        clearTimeout(timer);
        resolve({ ok: false, error: String(e.message || e) });
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          return resolve({ ok: false, error: (err || out || 'exit ' + code).trim() });
        }
        const lines = out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
        const version = lines[0] || '';
        const exe = lines[1] || pyPath;
        // require 3.9+
        const m = version.match(/^(\d+)\.(\d+)/);
        if (!m || Number(m[1]) < 3 || (Number(m[1]) === 3 && Number(m[2]) < 9)) {
          return resolve({ ok: false, error: 'python too old: ' + version });
        }
        resolve({ ok: true, path: exe, version });
      });
    });
  }

  async function findWorkingPython(cfg) {
    const tried = new Set();

    // 1) explicit candidates (never probe untrusted engine venv)
    for (const c of listPythonCandidates(cfg || {}, { includeEngineVenv: false })) {
      if (tried.has(c)) continue;
      tried.add(c);
      if (isWindowsStoreStub(c)) continue;
      if (!exists(c)) continue;
      const r = await probePython(c);
      if (r.ok) return r;
    }

    // 2) where / which (skip store stubs)
    const found = await whichAllPython();
    for (const c of found) {
      if (tried.has(c)) continue;
      tried.add(c);
      if (isWindowsStoreStub(c)) continue;
      const r = await probePython(c);
      if (r.ok) return r;
    }

    return { ok: false, error: 'not found' };
  }

  /** Resolve path for worker spawn (must return working path string) */
  function resolvePython(cfg) {
    // CRITICAL: worker must run inside tagger venv (has onnxruntime / deps).
    // Only use engine venv when that engine is explicitly trusted.
    if (cfg.taggerRoot && isEngineTrusted(cfg)) {
      const vp = venvPython(cfg.taggerRoot);
      if (exists(vp)) return vp;
    }
    if (cfg.pythonPath && exists(cfg.pythonPath) && !isWindowsStoreStub(cfg.pythonPath)) {
      return cfg.pythonPath;
    }
    for (const c of listPythonCandidates(cfg, { includeEngineVenv: false })) {
      if (exists(c) && !isWindowsStoreStub(c)) return c;
    }
    return process.platform === 'win32' ? 'python' : 'python3';
  }

  function isGpuProviderList(providers) {
    const list = providers || [];
    return list.some((p) => /CUDA|Tensorrt|Dml|ROCM|CoreML/i.test(String(p)));
  }

  async function probeVenvProviders(taggerRoot) {
    const vpy = venvPython(taggerRoot);
    if (!exists(vpy)) return { ok: false, providers: [], error: 'no venv' };
    const r = await runCmd(vpy, [
      '-c',
      'import onnxruntime as o; print(",".join(o.get_available_providers())); print(o.__version__)',
    ]);
    if (r.code !== 0) {
      return { ok: false, providers: [], error: (r.stderr || r.stdout || 'probe failed').trim() };
    }
    const lines = (r.stdout || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const providers = (lines[0] || '').split(',').map((s) => s.trim()).filter(Boolean);
    return { ok: true, providers, version: lines[1] || '', path: vpy };
  }

  function workerScript() {
    return path.join(pluginPath, 'python', 'worker.py');
  }

  function parseCsv(s) {
    if (!s) return [];
    return s.split(',').map((x) => x.trim()).filter(Boolean);
  }

  // ---------- process helpers ----------
  function runCmd(command, args, opts = {}) {
    return new Promise((resolve) => {
      const child = spawn(command, args, {
        cwd: opts.cwd,
        env: Object.assign({}, process.env, {
          PYTHONUTF8: '1',
          PYTHONIOENCODING: 'utf-8',
        }, opts.env || {}),
        windowsHide: true,
        shell: !!opts.shell,
      });
      let stdout = '';
      let stderr = '';
      if (child.stdout) {
        child.stdout.setEncoding('utf8');
        child.stdout.on('data', (d) => {
          const t = String(d);
          stdout += t;
          if (opts.onOut) opts.onOut(t);
        });
      }
      if (child.stderr) {
        child.stderr.setEncoding('utf8');
        child.stderr.on('data', (d) => {
          const t = String(d);
          stderr += t;
          if (opts.onErr) opts.onErr(t);
        });
      }
      child.on('error', (err) => {
        resolve({ code: -1, stdout, stderr: String(err), error: err });
      });
      child.on('close', (code) => {
        resolve({ code: code ?? -1, stdout, stderr });
      });
    });
  }

  function whichAllPython() {
    return new Promise((resolve) => {
      if (process.platform !== 'win32') {
        execFile('which', ['-a', 'python3', 'python'], { windowsHide: true }, (err, stdout) => {
          if (err || !stdout) return resolve([]);
          resolve(stdout.toString().split(/\r?\n/).map((s) => s.trim()).filter(Boolean));
        });
        return;
      }
      // `where` may list store stub first
      execFile('where.exe', ['python'], { windowsHide: true }, (err, stdout) => {
        const list = [];
        if (!err && stdout) {
          for (const line of stdout.toString().split(/\r?\n/)) {
            const s = line.trim();
            if (s) list.push(s);
          }
        }
        execFile('where.exe', ['python3'], { windowsHide: true }, (err2, stdout2) => {
          if (!err2 && stdout2) {
            for (const line of stdout2.toString().split(/\r?\n/)) {
              const s = line.trim();
              if (s && !list.includes(s)) list.push(s);
            }
          }
          resolve(list);
        });
      });
    });
  }

  /**
   * HTTPS-only download with host allowlist, redirect cap, and fixed destination.
   * Does not follow redirects to non-HTTPS or non-allowlisted hosts.
   */
  function downloadFile(url, dest, logFn, redirectsLeft) {
    const log = logFn || (() => {});
    const left = redirectsLeft == null ? DOWNLOAD_MAX_REDIRECTS : redirectsLeft;
    return new Promise((resolve, reject) => {
      if (!isAllowedDownloadUrl(url)) {
        reject(new Error('Download blocked: URL not on allowlist or not HTTPS: ' + url));
        return;
      }
      if (left < 0) {
        reject(new Error('Download blocked: too many redirects'));
        return;
      }

      let u;
      try {
        u = new URL(url);
      } catch (e) {
        reject(e);
        return;
      }

      const file = fs.createWriteStream(dest, { flags: 'w' });
      const req = https.get({
        protocol: 'https:',
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + u.search,
        headers: { 'User-Agent': 'Tagia-Eagle-Plugin/' + PLUGIN_VERSION },
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          try { fs.unlinkSync(dest); } catch {}
          let next = res.headers.location;
          try {
            // resolve relative redirects against current URL
            next = new URL(next, url).toString();
          } catch {}
          if (!isAllowedDownloadUrl(next)) {
            reject(new Error('Download blocked: redirect target not allowed: ' + next));
            return;
          }
          log('redirect → ' + next, 'info');
          downloadFile(next, dest, logFn, left - 1).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          file.close();
          try { fs.unlinkSync(dest); } catch {}
          reject(new Error('HTTP ' + res.statusCode + ' for ' + url));
          return;
        }
        const total = Number(res.headers['content-length'] || 0);
        let got = 0;
        let lastPct = -1;
        res.on('data', (chunk) => {
          got += chunk.length;
          if (total > 0) {
            const pct = Math.floor((got / total) * 100);
            if (pct >= lastPct + 10) {
              lastPct = pct;
              log('download ' + pct + '%', 'info');
            }
          }
        });
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve(dest)));
      });
      req.on('error', (e) => {
        try { file.close(); } catch {}
        try { fs.unlinkSync(dest); } catch {}
        reject(e);
      });
    });
  }

  async function verifyFileSha256(filePath, expectedHex, logFn) {
    const log = logFn || (() => {});
    const got = (await sha256File(filePath)).toLowerCase();
    const exp = String(expectedHex || '').toLowerCase();
    if (got !== exp) {
      throw new Error('SHA-256 mismatch.\n expected: ' + exp + '\n got:      ' + got);
    }
    log('SHA-256 OK: ' + got.slice(0, 16) + '…', 'ok');
    return got;
  }

  /**
   * Verify Windows Authenticode signature (Valid) and expected signer subject.
   */
  async function verifyAuthenticodeWindows(exePath, signerContains, logFn) {
    const log = logFn || (() => {});
    const ps = [
      "$ErrorActionPreference='Stop'",
      "$p = " + JSON.stringify(exePath),
      "$s = Get-AuthenticodeSignature -FilePath $p",
      "if ($s.Status -ne 'Valid') { Write-Output ('STATUS=' + $s.Status); exit 2 }",
      "Write-Output ('SUBJECT=' + $s.SignerCertificate.Subject)",
      "exit 0",
    ].join('; ');
    const r = await runCmd('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', ps,
    ]);
    const out = String(r.stdout || '') + String(r.stderr || '');
    if (r.code !== 0) {
      throw new Error('Authenticode invalid or unreadable: ' + out.trim());
    }
    const m = out.match(/SUBJECT=(.+)/);
    const subject = m ? m[1].trim() : '';
    if (!subject || (signerContains && subject.indexOf(signerContains) < 0)) {
      throw new Error('Authenticode signer mismatch: ' + subject);
    }
    log('Authenticode OK: ' + subject, 'ok');
    return subject;
  }

  /**
   * Install Python 3.10.11 via winget (explicit source + exact version), else
   * official installer with SHA-256 + Authenticode verification.
   * Note: uninstalling Tagia does NOT remove this system Python.
   */
  async function installPythonWindows(logFn) {
    const log = logFn || logInst;
    log('Python が見つからないため自動インストールを試行します…', 'info');
    log('Note: Tagia をアンインストールしても、ここで入れた Python は削除されずシステムに残ります。', 'warn');

    // Prefer winget — only explicit source "winget" and exact version
    const wingetCheck = await runCmd('where.exe', ['winget']);
    const hasWinget = wingetCheck.code === 0 && wingetCheck.stdout.trim();

    if (hasWinget) {
      const wp = WINGET_PYTHON;
      log(
        'winget install ' + wp.id + ' --version ' + wp.version + ' --source ' + wp.source,
        'info'
      );
      const r = await runCmd('winget', [
        'install',
        '-e',
        '--id', wp.id,
        '--version', wp.version,
        '--source', wp.source,
        '--accept-package-agreements',
        '--accept-source-agreements',
        '--disable-interactivity',
      ], {
        onOut: (t) => {
          const line = t.trim();
          if (line) log(line);
        },
        onErr: (t) => {
          const line = t.trim();
          if (line) log(line);
        },
      });
      log('winget exit: ' + r.code, r.code === 0 ? 'ok' : 'warn');
      const found = await findWorkingPython({});
      if (found.ok) {
        log('Python インストール成功: ' + found.path, 'ok');
        log(found.version, 'ok');
        return found;
      }
    } else {
      log('winget が使えません。公式インストーラを検証付きで取得します…', 'info');
    }

    // Fallback: official installer — HTTPS allowlist, random temp, SHA-256, Authenticode
    let tmp = '';
    try {
      const meta = PYTHON_WIN_INSTALLER;
      if (!isAllowedDownloadUrl(meta.url)) {
        throw new Error('Python installer URL not allowlisted');
      }
      tmp = secureTempPath('tagia-python-setup', '.exe');
      log('Downloading (pinned): ' + meta.url, 'info');
      await downloadFile(meta.url, tmp, log);
      await verifyFileSha256(tmp, meta.sha256, log);
      await verifyAuthenticodeWindows(tmp, meta.signerContains, log);

      log('サイレントインストール実行中…', 'info');
      const r = await runCmd(tmp, [
        '/quiet',
        'InstallAllUsers=0',
        'PrependPath=1',
        'Include_test=0',
        'Include_launcher=1',
        'SimpleInstall=1',
      ], {
        onOut: (t) => { if (t.trim()) log(t.trim()); },
        onErr: (t) => { if (t.trim()) log(t.trim()); },
      });
      log('installer exit: ' + r.code, r.code === 0 ? 'ok' : 'warn');
      await new Promise((res) => setTimeout(res, 2000));
      const found = await findWorkingPython({});
      if (found.ok) {
        log('Python インストール成功: ' + found.path, 'ok');
        return found;
      }
    } catch (e) {
      log('公式インストーラ失敗: ' + (e.message || e), 'err');
    } finally {
      if (tmp) {
        try { fs.unlinkSync(tmp); } catch {}
      }
    }

    return { ok: false, error: 'auto-install failed' };
  }

  function pluginPythonDir() {
    if (pluginPath) return path.join(pluginPath, 'python');
    try {
      return path.join(__dirname, '..', 'python');
    } catch {
      return path.join(process.cwd(), 'python');
    }
  }

  function bundledEngineRoot() {
    if (pluginPath) return path.join(pluginPath, 'vendor', 'wd14-tagger-standalone');
    try {
      return path.join(__dirname, '..', 'vendor', 'wd14-tagger-standalone');
    } catch {
      return path.join(process.cwd(), 'vendor', 'wd14-tagger-standalone');
    }
  }

  function copyPluginSecurityFiles(installDir, logFn) {
    const log = logFn || (() => {});
    const pyDir = pluginPythonDir();
    const names = [REQ_LOCKED_CPU, REQ_LOCKED_GPU, PIP_PINNED, MODELS_PINNED, 'worker.py'];
    for (const name of names) {
      const src = path.join(pyDir, name);
      if (!exists(src)) continue;
      try {
        fs.copyFileSync(src, path.join(installDir, name));
        log('Copied ' + name, 'ok');
      } catch (e) {
        log('Copy failed ' + name + ': ' + (e.message || e), 'warn');
      }
    }
    // Also keep under python/ for worker discovery of models-pinned.json next to worker
    try {
      const destPy = path.join(installDir, 'python');
      fs.mkdirSync(destPy, { recursive: true });
      for (const name of names) {
        const src = path.join(pyDir, name);
        if (exists(src)) fs.copyFileSync(src, path.join(destPy, name));
      }
    } catch {}
  }

  /**
   * Install engine from bundled vendor source (preferred), or download the same
   * pinned commit ZIP with SHA-256 verification. Writes ownership marker.
   */
  async function fetchPinnedEngine(installDir, logFn) {
    const log = logFn || logInst;
    const zipPath = secureTempPath('tagia-engine', '.zip');
    const extractDir = secureTempPath('tagia-engine-extract', '');
    try {
      log('Engine pin: ' + ENGINE_REPO + '@' + ENGINE_COMMIT.slice(0, 12), 'info');

      if (exists(installDir)) {
        const left = fs.readdirSync(installDir);
        if (left.length) {
          throw new Error('Install directory is not empty: ' + installDir);
        }
      }
      fs.mkdirSync(installDir, { recursive: true });

      // Prefer bundled vendor source only (reviewable; no mutable remote by default).
      // Optional hash-verified ZIP is last-resort if package was stripped of vendor/.
      const bundled = bundledEngineRoot();
      if (isTaggerRoot(bundled)) {
        setBusy('2/3 Engine', 'Copying bundled engine source…');
        log('Using bundled engine source: ' + bundled, 'ok');
        copyDirRecursive(bundled, installDir);
      } else {
        log('Bundled engine missing; falling back to pinned ZIP (SHA-256 verified)…', 'warn');
        if (!isAllowedDownloadUrl(ENGINE_ZIP_URL)) {
          throw new Error('Engine download URL not allowlisted');
        }
        await downloadFile(ENGINE_ZIP_URL, zipPath, log);
        await verifyFileSha256(zipPath, ENGINE_ZIP_SHA256, log);

        fs.mkdirSync(extractDir, { recursive: true });
        setBusy('2/3 Engine', 'Extracting archive…');
        const tar = await runCmd('tar', ['-xf', zipPath, '-C', extractDir], {
          onOut: (t) => { if (t.trim()) log(t.trim()); },
          onErr: (t) => { if (t.trim()) log(t.trim()); },
        });
        if (tar.code !== 0) {
          if (process.platform === 'win32') {
            const ps =
              'Expand-Archive -LiteralPath ' +
              JSON.stringify(zipPath) +
              ' -DestinationPath ' +
              JSON.stringify(extractDir) +
              ' -Force';
            const r2 = await runCmd('powershell.exe', [
              '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', ps,
            ]);
            if (r2.code !== 0) throw new Error('Extract failed (tar/Expand-Archive)');
          } else {
            throw new Error('Extract failed (tar exit ' + tar.code + ')');
          }
        }
        const top = fs.readdirSync(extractDir).filter((n) => !n.startsWith('.'));
        let srcRoot = extractDir;
        if (top.length === 1 && fs.statSync(path.join(extractDir, top[0])).isDirectory()) {
          srcRoot = path.join(extractDir, top[0]);
        }
        if (!isTaggerRoot(srcRoot)) throw new Error('Extracted archive is not a valid engine root');
        copyDirRecursive(srcRoot, installDir);
      }

      if (!isTaggerRoot(installDir)) {
        throw new Error('Engine root invalid after install');
      }

      copyPluginSecurityFiles(installDir, log);
      // Ownership marker is written only after full successful install via markOwnedEngineTrusted
      log('Engine files placed at: ' + installDir, 'ok');
      return installDir;
    } finally {
      try { if (exists(zipPath)) fs.unlinkSync(zipPath); } catch {}
      try { if (exists(extractDir)) rmDirRecursive(extractDir); } catch {}
    }
  }

  // ---------- worker lifecycle ----------
  function workerAlive() {
    return !!(
      workerProc &&
      workerReady &&
      workerProc.stdin &&
      !workerProc.stdin.destroyed &&
      workerProc.exitCode == null
    );
  }

  function writeWorker(obj) {
    if (
      !workerProc ||
      workerProc.killed ||
      workerProc.exitCode != null ||
      !workerProc.stdin ||
      workerProc.stdin.destroyed
    ) {
      throw new Error('Worker not running (stdin unavailable)');
    }
    workerProc.stdin.write(JSON.stringify(obj) + '\n');
  }

  function killWorker() {
    workerReady = false;
    // notify waiters (e.g. mid-tag) so Stop does not hang until timeout
    const pending = pendingHandlers.slice();
    pendingHandlers = [];
    for (const h of pending) {
      try {
        h({ ok: false, type: 'progress', cancelled: true, error: 'cancelled' });
      } catch {}
    }
    workerBuf = '';
    // Invalidate current token so late exit events are ignored
    workerToken += 1;
    const proc = workerProc;
    workerProc = null;
    if (proc) {
      try {
        if (proc.stdin && !proc.stdin.destroyed) {
          try { proc.stdin.write(JSON.stringify({ cmd: 'quit' }) + '\n'); } catch {}
        }
      } catch {}
      try { proc.kill(); } catch {}
    }
    setBadge('warn', 'app.statusDisconnected', true);
    $('stWorker').textContent = 'stopped';
  }

  function sendWorker(msg) {
    return new Promise((resolve, reject) => {
      try {
        const onMsg = (m) => { resolve(m); };
        if (!msg._stream) pendingHandlers.push(onMsg);
        writeWorker(msg);
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Stream tag command: calls onEvent for each progress/done message.
   */
  function sendTagStream(payload, onEvent) {
    return new Promise((resolve, reject) => {
      const handler = (m) => {
        try { onEvent(m); } catch (e) { logMain(String(e), 'err'); }
        if (m && m.type === 'done') {
          pendingHandlers = pendingHandlers.filter((h) => h !== handler);
          resolve(m);
        } else if (m && m.ok === false && !m.type) {
          pendingHandlers = pendingHandlers.filter((h) => h !== handler);
          reject(new Error(m.error || 'tag failed'));
        }
      };
      pendingHandlers.push(handler);
      try {
        writeWorker(Object.assign({ cmd: 'tag' }, payload));
      } catch (e) {
        pendingHandlers = pendingHandlers.filter((h) => h !== handler);
        reject(e);
      }
    });
  }

  function handleWorkerLine(line, token) {
    // ignore output from dead/replaced workers
    if (token !== workerToken) return;

    let msg;
    try { msg = JSON.parse(line); } catch { return; }

    if (msg.type === 'ready') {
      workerReady = true;
      setBadge('ok', 'app.statusConnected', true);
      $('stWorker').textContent = 'ready';
      const providers = msg.available_providers || [];
      $('stProviders').textContent = providers.join(', ') || '—';
      markStep('step-gpu', isGpuProviderList(providers));
      fillModels(null, readUiConfig().model);
      logMain('Worker ready', 'ok');
    }

    if (msg.type === 'loaded') {
      const providers = msg.providers || [];
      $('stModel').textContent = `${msg.model} [${providers.join(',')}]`;
      setBadge('ok', 'app.statusModelLoaded', true);
      if (isGpuProviderList(providers)) {
        markStep('step-gpu', true);
      }
    }

    const handlers = pendingHandlers.slice();
    for (const h of handlers) {
      try { h(msg); } catch {}
    }
  }

  async function ensureWorker(cfg, { forceRestart = false } = {}) {
    if (!forceRestart && workerAlive()) return true;

    if (forceRestart || workerProc) {
      killWorker();
      // brief pause so Windows releases the killed process cleanly
      await new Promise((r) => setTimeout(r, 150));
    }

    if (!cfg.taggerRoot || !isTaggerRoot(cfg.taggerRoot)) {
      throw new Error(t('errors.engineTitle') + ': ' + t('errors.engineDetail'));
    }
    if (!isEngineTrusted(cfg)) {
      throw new Error(t('errors.engineUntrusted'));
    }
    const vpy = venvPython(cfg.taggerRoot);
    if (!exists(vpy)) {
      throw new Error(t('errors.engineDetail'));
    }
    // Always use trusted engine venv — never fall back to arbitrary candidate python
    const py = vpy;
    const script = workerScript();
    if (!exists(script)) throw new Error('worker.py が見つかりません: ' + script);

    const myToken = ++workerToken;
    logMain(`Starting worker: ${py}`, 'info');
    workerReady = false;
    workerBuf = '';

    const proc = spawn(py, [
      '-u',
      script,
      '--tagger-root', cfg.taggerRoot,
    ], {
      cwd: cfg.taggerRoot,
      windowsHide: true,
      env: Object.assign({}, process.env, {
        PYTHONUTF8: '1',
        PYTHONIOENCODING: 'utf-8',
        PYTHONNOUSERSITE: '1',
      }),
    });
    workerProc = proc;

    let localBuf = '';
    proc.stdout.setEncoding('utf8');
    proc.stderr.setEncoding('utf8');

    proc.stdout.on('data', (chunk) => {
      if (myToken !== workerToken) return;
      localBuf += chunk;
      let idx;
      while ((idx = localBuf.indexOf('\n')) >= 0) {
        const line = localBuf.slice(0, idx).trim();
        localBuf = localBuf.slice(idx + 1);
        if (line) handleWorkerLine(line, myToken);
      }
    });

    proc.stderr.on('data', (chunk) => {
      if (myToken !== workerToken) return;
      const t = String(chunk).trim();
      if (t) logMain(t, 'info');
    });

    proc.on('exit', (code) => {
      // Only act if this process is still the active worker
      if (myToken !== workerToken || workerProc !== proc) {
        return;
      }
      logMain(`Worker exited (${code})`, code === 0 ? 'warn' : 'err');
      workerProc = null;
      workerReady = false;
      setBadge('warn', 'app.statusDisconnected', true);
      $('stWorker').textContent = 'exited ' + code;
    });

    proc.on('error', (err) => {
      if (myToken !== workerToken) return;
      logMain('Worker error: ' + err.message, 'err');
      setBadge('err', 'app.statusError', true);
    });

    const ok = await waitForReady(30000, myToken);
    if (!ok || !workerAlive()) {
      // if ready flag set but stdin gone, clear
      if (myToken === workerToken) {
        workerReady = false;
      }
      throw new Error('Worker の起動に失敗しました。設定タブで Worker再起動 / 環境チェックを試してください。');
    }
    return true;
  }

  function waitForReady(timeoutMs, token) {
    return new Promise((resolve) => {
      if (workerReady && workerToken === token && workerAlive()) return resolve(true);
      const start = Date.now();
      const t = setInterval(() => {
        if (token != null && token !== workerToken) {
          clearInterval(t);
          resolve(false);
          return;
        }
        if (workerReady && workerAlive()) {
          clearInterval(t);
          resolve(true);
        } else if (Date.now() - start > timeoutMs) {
          clearInterval(t);
          resolve(false);
        }
      }, 50);
    });
  }

  async function workerStatus() {
    if (!workerAlive()) return null;
    return await new Promise((resolve) => {
      const handler = (m) => {
        if (m && m.type === 'status') {
          pendingHandlers = pendingHandlers.filter((h) => h !== handler);
          resolve(m);
        }
      };
      pendingHandlers.push(handler);
      try {
        writeWorker({ cmd: 'status' });
      } catch {
        pendingHandlers = pendingHandlers.filter((h) => h !== handler);
        resolve(null);
      }
      setTimeout(() => {
        pendingHandlers = pendingHandlers.filter((h) => h !== handler);
        resolve(null);
      }, 5000);
    });
  }

  // ---------- selection ----------
  async function refreshSelection() {
    if (!pluginReady) {
      // Eagle throws if item API is used before plugin-create
      return selectedItems;
    }
    try {
      const items = await eagle.item.getSelected();
      selectedItems = (items || []).filter((it) => {
        const ext = (it.ext || '').toLowerCase().replace(/^\./, '');
        return IMAGE_EXTS.has(ext);
      });
      const el = $('selCount');
      if (el) el.textContent = String(selectedItems.length);
      return selectedItems;
    } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      // Avoid spamming log for expected lifecycle races
      if (!/plugin-create/i.test(msg)) {
        logMain('選択取得失敗: ' + msg, 'err');
      }
      selectedItems = [];
      const el = $('selCount');
      if (el) el.textContent = '0';
      return [];
    }
  }

  async function afterPluginReady() {
    // deferred work from run/show that fired too early
    if (runPending || showPending) {
      runPending = false;
      showPending = false;
      await refreshSelection();
      softEnvBadge();
    }
  }

  /**
   * Startup badge: filesystem layout only — never execute Python from a candidate engine.
   */
  function softEnvBadge() {
    const cfg = loadConfig();
    const layoutOk = !!(cfg.taggerRoot && isTaggerRoot(cfg.taggerRoot));
    const venvOk = !!(layoutOk && exists(venvPython(cfg.taggerRoot)));
    markStep('step-clone', layoutOk);
    markStep('step-venv', venvOk);
    if (layoutOk && venvOk && isEngineTrusted(cfg)) {
      setBadge('warn', 'app.statusIdle', true);
    } else if (layoutOk && venvOk && !isEngineTrusted(cfg)) {
      setBadge('warn', 'app.statusUntrusted', true);
    } else {
      setBadge('warn', 'app.statusSetup', true);
    }
  }

  // ---------- tagging ----------
  /** Safe memo markers — never wipe user-written notes outside this block */
  const TAGIA_START = '<!-- Tagia -->';
  const TAGIA_END = '<!-- /Tagia -->';
  const TAGIA_BLOCK_RE = /<!--\s*Tagia\s*-->\s*[\s\S]*?\s*<!--\s*\/Tagia\s*-->/i;

  function buildTagiaBlock(tagsLine) {
    return TAGIA_START + '\n' + tagsLine + '\n' + TAGIA_END;
  }

  /**
   * Merge tags into annotation without destroying free-form notes.
   * - Existing Tagia block → replace only that block
   * - No block, empty memo → write block
   * - No block, has memo → append block after user text
   */
  function mergeAnnotationSafe(prev, tagsLine) {
    const block = buildTagiaBlock(tagsLine);
    const p = prev != null ? String(prev) : '';
    if (TAGIA_BLOCK_RE.test(p)) {
      return p.replace(TAGIA_BLOCK_RE, block);
    }
    const trimmed = p.trim();
    if (!trimmed) return block;
    return trimmed + '\n\n' + block;
  }

  function isEngineReady(cfg) {
    return !!(
      cfg &&
      cfg.taggerRoot &&
      isTaggerRoot(cfg.taggerRoot) &&
      exists(venvPython(cfg.taggerRoot)) &&
      isEngineTrusted(cfg)
    );
  }

  function switchTab(tabId) {
    document.querySelectorAll('.tab').forEach((tab) => {
      const on = tab.getAttribute('data-tab') === tabId;
      tab.classList.toggle('active', on);
    });
    document.querySelectorAll('.panel').forEach((p) => {
      p.classList.toggle('active', p.id === 'panel-' + tabId);
    });
    if (tabId === 'tag') refreshSelection();
  }

  /**
   * Classify error → i18n title/detail/next steps for user dialogs.
   */
  function classifyError(err) {
    const msg = String(err && err.message ? err.message : err || '');
    if (/GPU_PROVIDER|GPU provider|GPU が使え|GPU不可/i.test(msg)) {
      return {
        kind: 'gpu',
        title: t('errors.gpuTitle'),
        detail: t('errors.gpuDetail'),
        next: t('errors.gpuNext'),
      };
    }
    if (/Engine path|tagger-root|venv|worker\.py|Worker の起動|not found|セットアップ|setup/i.test(msg)) {
      return {
        kind: 'engine',
        title: t('errors.engineTitle'),
        detail: t('errors.engineDetail'),
        next: t('errors.engineNext'),
      };
    }
    if (/Python|pip|SHA-256|Authenticode|engine archive|Download blocked|Extract failed/i.test(msg)) {
      return {
        kind: 'install',
        title: t('errors.installTitle'),
        detail: t('errors.installDetail'),
        next: t('errors.installNext'),
      };
    }
    if (/timeout|stdin|Worker not running/i.test(msg)) {
      return {
        kind: 'worker',
        title: t('errors.workerTitle'),
        detail: t('errors.workerDetail'),
        next: t('errors.workerNext'),
      };
    }
    return {
      kind: 'generic',
      title: t('common.error'),
      detail: msg || t('errors.genericDetail'),
      next: t('errors.genericNext'),
    };
  }

  async function showErrorGuide(err) {
    const info = classifyError(err);
    const full = [info.detail, '', info.next, '', String(err && err.message ? err.message : err || '')]
      .filter(Boolean)
      .join('\n');
    logMain(info.title + ': ' + (err && err.message ? err.message : err), 'err');
    const buttons = [t('common.ok')];
    if (info.kind === 'engine' || info.kind === 'install' || info.kind === 'gpu') {
      buttons.unshift(t('setup.goInstall'));
    }
    try {
      const r = await eagle.dialog.showMessageBox({
        title: info.title,
        message: info.title,
        detail: full,
        buttons,
        type: 'error',
      });
      if (buttons[r.response] === t('setup.goInstall')) {
        switchTab('install');
      }
    } catch {
      await eagle.notification.show({
        title: info.title,
        body: info.detail,
        duration: 6000,
      });
    }
  }

  async function ensureSetupOrPrompt(cfg) {
    if (isEngineReady(cfg)) return true;
    try {
      const r = await eagle.dialog.showMessageBox({
        title: t('app.title'),
        message: t('setup.neededTitle'),
        detail: t('setup.neededDetail'),
        buttons: [t('setup.goInstall'), t('common.cancel')],
        type: 'warning',
      });
      if (r.response === 0) switchTab('install');
    } catch {
      switchTab('install');
    }
    return false;
  }

  async function applyTagsToItem(item, tags, opts) {
    const append = !!(opts && opts.append);
    const writeAnnotation = !!(opts && opts.writeAnnotation);
    const next = tags.slice();

    if (append) {
      const existing = Array.isArray(item.tags) ? item.tags : [];
      const set = new Set(existing.map(String));
      for (const tag of next) {
        if (!set.has(tag)) {
          existing.push(tag);
          set.add(tag);
        }
      }
      item.tags = existing;
    } else {
      item.tags = next;
    }

    // Note / annotation — only update <!-- Tagia --> block (never wipe free notes)
    if (writeAnnotation && next.length) {
      const line = next.join(', ');
      const prev = item.annotation != null ? String(item.annotation) : '';
      item.annotation = mergeAnnotationSafe(prev, line);
    }

    await item.save();
  }

  /** Tag one image path; model already loaded. Returns progress message. */
  function tagOnePath(cfg, filePath) {
    return new Promise((resolve, reject) => {
      if (stopRequested) {
        resolve({ ok: false, type: 'progress', cancelled: true, path: filePath });
        return;
      }
      let settled = false;
      const finish = (fn, arg) => {
        if (settled) return;
        settled = true;
        pendingHandlers = pendingHandlers.filter((h) => h !== handler && h !== doneSweep);
        clearTimeout(timer);
        fn(arg);
      };
      const handler = (m) => {
        if (!m) return;
        if (m.cancelled || (m.error === 'cancelled')) {
          finish(resolve, { ok: false, type: 'progress', cancelled: true, path: filePath });
          return;
        }
        if (m.type === 'progress') {
          finish(resolve, m);
          return;
        }
        if (m.ok === false && m.error && !m.type) {
          finish(reject, new Error(m.error));
        }
      };
      const doneSweep = (m) => {
        // swallow trailing done for single-file jobs
        if (m && m.type === 'done' && settled) {
          pendingHandlers = pendingHandlers.filter((h) => h !== doneSweep);
        }
      };
      pendingHandlers.push(handler);
      pendingHandlers.push(doneSweep);
      try {
        writeWorker({
          cmd: 'tag',
          model: cfg.model,
          device: cfg.device,
          paths: [filePath],
          threshold: cfg.threshold,
          rawtag: cfg.rawtag,
          max_tags: cfg.maxTags,
          exclude_tags: parseCsv(cfg.excludeTags),
          additional_tags: parseCsv(cfg.additionalTags),
        });
      } catch (e) {
        finish(reject, e);
        return;
      }
      const timer = setTimeout(() => {
        finish(reject, new Error('tag timeout'));
      }, 180000);
    });
  }

  async function runTagging() {
    if (tagging) return;
    const cfg = readUiConfig();
    saveConfig(cfg);

    // Must-have: setup guide before tagging
    if (!(await ensureSetupOrPrompt(cfg))) {
      logMain(t('setup.neededTitle'), 'warn');
      return;
    }

    await refreshSelection();
    if (!selectedItems.length) {
      await eagle.dialog.showMessageBox({
        title: t('app.title'),
        message: t('tag.noSelectionTitle'),
        detail: t('tag.noSelectionDetail'),
        buttons: [t('common.ok')],
        type: 'info',
      });
      return;
    }

    let items = selectedItems.slice();
    if (cfg.skipTagged) {
      items = items.filter((it) => !it.tags || it.tags.length === 0);
      if (!items.length) {
        logMain(t('tag.allSkipped'), 'warn');
        return;
      }
    }

    tagging = true;
    stopRequested = false;
    $('btnTag').disabled = true;
    $('btnStop').disabled = false;
    setProgress(0, items.length, t('tag.preparing'));
    logMain(t('tag.startBatch', { count: items.length, device: cfg.device, model: cfg.model }), 'info');

    const t0 = Date.now();
    let done = 0;
    let ok = 0;
    let fail = 0;
    let cancelled = false;

    try {
      if (cfg.device === 'gpu') {
        const probe = await probeVenvProviders(cfg.taggerRoot);
        if (!probe.ok || !isGpuProviderList(probe.providers)) {
          setBadge('err', 'app.statusError', true);
          throw new Error('GPU provider unavailable. Install GPU package or use Auto/CPU.');
        }
        logMain('GPU providers OK: ' + probe.providers.join(', '), 'ok');
      }

      await ensureWorker(cfg);

      // preload model once
      const loadErr = await new Promise((resolve) => {
        const handler = (m) => {
          if (m && m.type === 'loaded') {
            pendingHandlers = pendingHandlers.filter((h) => h !== handler);
            resolve(null);
          } else if (m && m.ok === false && m.error) {
            pendingHandlers = pendingHandlers.filter((h) => h !== handler);
            resolve(m.error);
          }
        };
        pendingHandlers.push(handler);
        try {
          writeWorker({
            cmd: 'load',
            model: cfg.model,
            device: cfg.device,
          });
        } catch (e) {
          pendingHandlers = pendingHandlers.filter((h) => h !== handler);
          resolve(e.message || String(e));
          return;
        }
        setTimeout(() => {
          pendingHandlers = pendingHandlers.filter((h) => h !== handler);
          resolve('model load timeout');
        }, 180000);
      });
      if (loadErr) throw new Error(loadErr);

      // one-by-one so Stop works between images (model stays loaded)
      const jobs = [];
      for (const it of items) {
        const fp = it.filePath;
        if (!fp || !exists(fp)) {
          logMain(`missing file: ${it.name}`, 'err');
          fail++;
          continue;
        }
        jobs.push({ item: it, path: fp });
      }
      if (!jobs.length) throw new Error(t('errors.noValidPaths'));

      for (let i = 0; i < jobs.length; i++) {
        if (stopRequested) {
          cancelled = true;
          logMain(t('tag.stoppedAt', { done: ok + fail, total: jobs.length }), 'warn');
          break;
        }

        const job = jobs[i];
        const elapsed = (Date.now() - t0) / 1000;
        const speed = done > 0 ? (done / elapsed).toFixed(2) + ' img/s' : '';
        setProgress(i, jobs.length, `${i}/${jobs.length}`, speed);

        try {
          const m = await tagOnePath(cfg, job.path);
          if (stopRequested || (m && m.cancelled)) {
            cancelled = true;
            break;
          }
          done = i + 1;
          setProgress(done, jobs.length, `${done}/${jobs.length}`, speed);

          if (m && m.ok && m.tags) {
            try {
              await applyTagsToItem(job.item, m.tags, {
                append: cfg.modeAppend,
                writeAnnotation: cfg.writeAnnotation,
              });
              ok++;
              logMain(`OK ${path.basename(job.path)} → ${m.tags.length} tags`, 'ok');
            } catch (e) {
              fail++;
              logMain(`save fail ${path.basename(job.path)}: ${e.message}`, 'err');
            }
          } else {
            fail++;
            logMain(`NG ${path.basename(job.path)}: ${(m && m.error) || 'error'}`, 'err');
          }
        } catch (e) {
          if (stopRequested) {
            cancelled = true;
            break;
          }
          fail++;
          logMain(`NG ${path.basename(job.path)}: ${e.message}`, 'err');
        }
      }

      const sec = ((Date.now() - t0) / 1000).toFixed(1);
      if (cancelled) {
        logMain(t('tag.stoppedSummary', { ok, fail, sec }), 'warn');
        setProgress(ok + fail, jobs.length, t('tag.stoppedSummary', { ok, fail, sec }), sec + 's');
        await eagle.notification.show({
          title: t('app.title'),
          body: t('tag.stoppedSummary', { ok, fail, sec }),
          duration: 4500,
        });
      } else {
        logMain(t('tag.done', { ok, fail, sec }), 'ok');
        setProgress(jobs.length, jobs.length, t('tag.done', { ok, fail, sec }), sec + 's');
        await eagle.notification.show({
          title: t('app.title'),
          body: t('tag.doneBody', { ok, fail, sec }),
          duration: 4000,
        });
      }
    } catch (e) {
      setBadge('err', 'app.statusError', true);
      await showErrorGuide(e);
    } finally {
      tagging = false;
      stopRequested = false;
      $('btnTag').disabled = false;
      $('btnStop').disabled = true;
      if (!cfg.keepWorker) {
        killWorker();
      }
    }
  }

  async function warmupModel() {
    const cfg = readUiConfig();
    saveConfig(cfg);
    if (!(await ensureSetupOrPrompt(cfg))) return;
    try {
      await ensureWorker(cfg);
      logMain(`Loading model ${cfg.model} (${cfg.device})…`, 'info');
      setBadge('warn', 'app.statusLoading', true);
      await new Promise((resolve, reject) => {
        const handler = (m) => {
          if (m && m.type === 'loaded') {
            pendingHandlers = pendingHandlers.filter((h) => h !== handler);
            logMain(`Loaded: ${m.model} / ${(m.providers || []).join(', ')}`, 'ok');
            resolve(m);
          } else if (m && m.ok === false && m.error) {
            pendingHandlers = pendingHandlers.filter((h) => h !== handler);
            reject(new Error(m.error));
          }
        };
        pendingHandlers.push(handler);
        try {
          writeWorker({
            cmd: 'load',
            model: cfg.model,
            device: cfg.device,
          });
        } catch (e) {
          pendingHandlers = pendingHandlers.filter((h) => h !== handler);
          reject(e);
          return;
        }
        setTimeout(() => {
          pendingHandlers = pendingHandlers.filter((h) => h !== handler);
          reject(new Error('model load timeout'));
        }, 300000);
      });
    } catch (e) {
      logMain('Warmup failed: ' + e.message, 'err');
      setBadge('err', 'app.statusError', true);
    }
  }

  // ---------- environment check / install ----------
  function markStep(id, done) {
    const el = $(id);
    if (!el) return;
    if (done) el.classList.add('done');
    else el.classList.remove('done');
  }

  async function checkEnvironment() {
    const cfg = readUiConfig();
    // System / bootstrap Python only — do not execute engine venv unless trusted
    const found = await findWorkingPython(cfg);
    const py = found.ok ? found.path : resolvePython(cfg);
    $('stPython').textContent = found.ok ? `${py} (${(found.version || '').split(' ')[0]})` : (py + ' (未確認)');
    $('stRoot').textContent = cfg.taggerRoot || '—';
    const vp = cfg.taggerRoot ? venvPython(cfg.taggerRoot) : '';
    const hasVenv = exists(vp);
    const layoutOk = !!(cfg.taggerRoot && isTaggerRoot(cfg.taggerRoot));
    $('stVenv').textContent = hasVenv ? vp : 'なし';

    markStep('step-python', !!found.ok);
    markStep('step-clone', layoutOk);
    markStep('step-venv', hasVenv);

    if (layoutOk && hasVenv && !isEngineTrusted(cfg)) {
      logMain(t('errors.engineUntrusted'), 'warn');
      setBadge('warn', 'app.statusUntrusted', true);
      $('stProviders').textContent = '—';
      $('stWorker').textContent = 'untrusted';
      return;
    }

    if (isEngineReady(cfg)) {
      try {
        await ensureWorker(cfg, { forceRestart: true });
        const st = await workerStatus();
        if (st) {
          const providers = st.available_providers || st.providers || [];
          $('stProviders').textContent = providers.join(', ');
          $('stModel').textContent = st.loaded ? `${st.model} (${st.device})` : 'not loaded';
          const hasGpu = isGpuProviderList(providers);
          markStep('step-gpu', hasGpu);
          fillModels(null, cfg.model);
          logMain('OK / providers: ' + providers.join(', '), 'ok');
          setBadge('ok', hasGpu ? 'app.statusGpuOk' : 'app.statusCpu', true);
        }
      } catch (e) {
        logMain('Check failed: ' + e.message, 'err');
        setBadge('err', 'app.statusSetup', true);
      }
    } else {
      setBadge('warn', 'app.statusSetup', true);
      logMain(t('app.statusSetup'), 'warn');
    }
  }

  /** Full setup is Windows x86_64 + CPython 3.10 only (matches hash-locked wheels). */
  function isSupportedPlatform() {
    if (process.platform !== 'win32') return false;
    const arch = String(process.arch || '').toLowerCase();
    return arch === 'x64' || arch === 'ia32'; // ia32 host rare; wheels are win_amd64
  }

  function isX64Windows() {
    if (process.platform !== 'win32') return false;
    // prefer true x64 (native or WoW64)
    const arch = String(process.arch || '').toLowerCase();
    if (arch === 'x64') return true;
    try {
      if (process.env.PROCESSOR_ARCHITECTURE === 'AMD64') return true;
      if (process.env.PROCESSOR_ARCHITEW6432 === 'AMD64') return true;
    } catch {}
    return false;
  }

  function pythonLooksLike310(versionLine) {
    const s = String(versionLine || '');
    // e.g. Python 3.10.11
    return /Python\s+3\.10\b/i.test(s) || /\b3\.10\.\d+/.test(s);
  }

  async function assertSupportedPlatformOrExplain(logFn) {
    const log = logFn || logInst;
    if (isX64Windows()) return true;
    log(t('install.platformUnsupported'), 'err');
    try {
      await eagle.dialog.showMessageBox({
        title: t('app.title'),
        message: t('install.platformUnsupportedTitle'),
        detail: t('install.platformUnsupported'),
        buttons: [t('common.ok')],
        type: 'warning',
      });
    } catch {}
    return false;
  }

  /**
   * Consent dialogs must fail closed.
   * Continue only on explicit button index 0 (continue/install).
   * Cancel, missing response, or any exception → false (stop).
   */
  async function confirmInstallImpacts() {
    try {
      if (!pluginReady || typeof eagle === 'undefined' || !eagle.dialog || !eagle.dialog.showMessageBox) {
        logInst(t('install.consentDialogFailed'), 'err');
        return false;
      }
      const r = await eagle.dialog.showMessageBox({
        title: t('install.consentTitle'),
        message: t('install.consentTitle'),
        detail: t('install.consentDetail'),
        buttons: [t('install.consentContinue'), t('common.cancel')],
        type: 'info',
      });
      if (!r || typeof r.response !== 'number') {
        logInst(t('install.consentDialogFailed'), 'err');
        return false;
      }
      return r.response === 0;
    } catch (e) {
      logInst(t('install.consentDialogFailed') + ': ' + (e && e.message ? e.message : e), 'err');
      return false;
    }
  }

  /** Separate confirmation before installing system Python (persists after uninstall). */
  async function confirmPythonAutoInstall() {
    try {
      if (!pluginReady || typeof eagle === 'undefined' || !eagle.dialog || !eagle.dialog.showMessageBox) {
        logInst(t('install.pythonAutoDialogFailed'), 'err');
        return false;
      }
      const r = await eagle.dialog.showMessageBox({
        title: t('install.pythonAutoTitle'),
        message: t('install.pythonAutoTitle'),
        detail: t('install.pythonAutoDetail'),
        buttons: [t('install.pythonAutoOk'), t('common.cancel')],
        type: 'warning',
      });
      if (!r || typeof r.response !== 'number') {
        logInst(t('install.pythonAutoDialogFailed'), 'err');
        return false;
      }
      return r.response === 0;
    } catch (e) {
      logInst(t('install.pythonAutoDialogFailed') + ': ' + (e && e.message ? e.message : e), 'err');
      return false;
    }
  }

  async function installAll() {
    const cfg = readUiConfig();
    let installDir = cfg.installDir || defaultConfig().installDir;
    $('installDir').value = installDir;

    if (!(await assertSupportedPlatformOrExplain(logInst))) {
      return;
    }
    if (!(await confirmInstallImpacts())) {
      // cancel OR dialog failure — never continue to pip/winget/download
      logInst(t('install.consentCancel'), 'warn');
      return;
    }

    startBusy('一括インストール', '準備中…');
    logInst('=== 一括インストール開始 ===', 'info');
    logInst('Platform: Windows x86_64 / CPython 3.10 (supported setup)', 'info');

    try {
      // 1) Python: detect → auto-install if missing
      setBusy('1/3 Python', '検索中…');
      logInst('Python を検索中…', 'info');
      let found = await findWorkingPython(cfg);

      if (found.ok && !pythonLooksLike310(found.version)) {
        logInst(
          'Found Python but not 3.10.x: ' + (found.version || found.path) +
          ' — Tagia requires CPython 3.10 for hash-locked wheels.',
          'warn'
        );
        // Prefer auto-install of exact 3.10.11 when wrong major/minor is present
        found = { ok: false, error: 'need-python-3.10' };
      }

      if (!found.ok) {
        logInst('有効な Python 3.10 が見つかりませんでした', 'warn');
        // Fail closed: no winget / python.org installer without explicit consent
        if (!(await confirmPythonAutoInstall())) {
          logInst(t('install.pythonAutoCancel'), 'warn');
          markStep('step-python', false);
          return;
        }
        setBusy('1/3 Python', '自動インストール中…');
        found = await installPythonWindows(logInst);
      }

      if (!found.ok) {
        logInst('Python の自動インストールに失敗しました。', 'err');
        logInst('https://www.python.org/downloads/ から Python 3.10.11 を入れ、', 'err');
        logInst('「Add python.exe to PATH」にチェックを入れて再実行してください。', 'err');
        markStep('step-python', false);
        return;
      }

      const py = found.path;
      logInst('Python: ' + py, 'ok');
      logInst(found.version || '', 'ok');
      if (!pythonLooksLike310(found.version)) {
        logInst('Warning: Python version string does not look like 3.10.x', 'warn');
      }
      markStep('step-python', true);
      $('pythonPath').value = py;
      $('stPython').textContent = py;

      // 2) Engine: reuse previously recorded Tagia-owned path, trusted user path, or create new
      setBusy('2/3 Engine', 'Checking layout…');
      let pluginCreatedEngine = false;
      if (
        cfg.ownedInstallPath &&
        samePath(cfg.ownedInstallPath, installDir) &&
        exists(installDir) &&
        isTaggerRoot(installDir) &&
        markerClaimsPath(installDir) &&
        isEngineTrusted(Object.assign({}, cfg, { taggerRoot: installDir }))
      ) {
        logInst('Reusing Tagia-owned engine recorded in settings: ' + installDir, 'ok');
      } else if (
        cfg.taggerRoot &&
        isTaggerRoot(cfg.taggerRoot) &&
        isEngineTrusted(cfg) &&
        cfg.trustedEngine &&
        cfg.trustedEngine.owned === false
      ) {
        installDir = cfg.taggerRoot;
        logInst('Using trusted user-managed engine: ' + installDir, 'ok');
      } else if (exists(installDir) && isTaggerRoot(installDir)) {
        // Existing directory (even with a .tagia-owned.json) is NEVER auto-owned.
        // Folder already exists → user-managed trust only; do not write/refresh ownership marker.
        logInst('Existing engine directory found; treating as user-managed (trust required)', 'warn');
        if (!(await confirmTrustEngine(installDir))) {
          logInst(t('settings.trustEngineCancel'), 'warn');
          markStep('step-clone', false);
          return;
        }
        markUserManagedTrusted(cfg, installDir);
        saveConfig(cfg);
      } else {
        fs.mkdirSync(path.dirname(installDir), { recursive: true });
        if (exists(installDir)) {
          try {
            const left = fs.readdirSync(installDir);
            if (left.length) {
              logInst('Install directory is not empty: ' + installDir, 'err');
              return;
            }
          } catch {}
        }
        setBusy('2/3 Engine', 'Installing bundled engine…');
        try {
          await fetchPinnedEngine(installDir, logInst);
          pluginCreatedEngine = true;
        } catch (e) {
          logInst('Engine install failed: ' + (e.message || e), 'err');
          markStep('step-clone', false);
          return;
        }
      }
      if (!isTaggerRoot(installDir)) {
        logInst('Invalid engine root after install step', 'err');
        markStep('step-clone', false);
        return;
      }
      markStep('step-clone', true);
      $('taggerRoot').value = installDir;

      // 3) venv + pinned packages (from this plugin, not mutable remote requirements)
      setBusy('3/3 venv + packages', 'Preparing virtualenv…');
      const vpy = venvPython(installDir);
      if (!exists(vpy)) {
        logInst('Creating venv…', 'info');
        const v = await runCmd(py, ['-m', 'venv', path.join(installDir, 'venv')], {
          cwd: installDir,
          onOut: (t) => { if (t.trim()) logInst(t.trim(), 'info'); },
          onErr: (t) => { if (t.trim()) logInst(t.trim(), 'info'); },
        });
        if (v.code !== 0 || !exists(vpy)) {
          logInst('venv creation failed', 'err');
          if (v.stderr) logInst(v.stderr, 'err');
          if (v.stdout) logInst(v.stdout, 'err');
          markStep('step-venv', false);
          return;
        }
      } else {
        logInst('venv already exists', 'ok');
      }

      // Bootstrap exact pip version with hash (never unconstrained --upgrade pip)
      setBusy('3/3 venv + packages', 'Installing pinned pip…');
      const pipPinSrc = path.join(pluginPythonDir(), PIP_PINNED);
      const pipPinDst = path.join(installDir, PIP_PINNED);
      if (exists(pipPinSrc)) {
        try { fs.copyFileSync(pipPinSrc, pipPinDst); } catch {}
      }
      if (exists(pipPinDst)) {
        logInst('Installing pip==' + PINNED_PIP_VERSION + ' with --require-hashes…', 'info');
        const pipInst = await runCmd(
          vpy,
          ['-m', 'pip', 'install', '--disable-pip-version-check', '--require-hashes', '-r', pipPinDst],
          {
            cwd: installDir,
            onOut: (t) => { if (t.trim()) logInst(t.trim()); },
            onErr: (t) => { if (t.trim()) logInst(t.trim()); },
          }
        );
        logInst('pip pin exit: ' + pipInst.code, pipInst.code === 0 ? 'ok' : 'warn');
      } else {
        logInst('pip-pinned.txt missing; keeping venv pip as-is (no upgrade)', 'warn');
      }

      setBusy('3/3 venv + packages', 'Installing hash-locked deps…');
      copyPluginSecurityFiles(installDir, logInst);
      const lockedReq = path.join(installDir, REQ_LOCKED_CPU);
      if (!exists(lockedReq)) {
        logInst('Missing ' + REQ_LOCKED_CPU + ' — cannot install safely', 'err');
        markStep('step-venv', false);
        return;
      }
      logInst('pip install --require-hashes -r ' + REQ_LOCKED_CPU + ' (may take a few minutes)…', 'info');
      const inst = await runCmd(
        vpy,
        [
          '-m', 'pip', 'install',
          '--disable-pip-version-check',
          '--require-hashes',
          '-r', lockedReq,
        ],
        {
          cwd: installDir,
          onOut: (t) => { if (t.trim()) logInst(t.trim()); },
          onErr: (t) => { if (t.trim()) logInst(t.trim()); },
        }
      );
      if (inst.code !== 0) {
        logInst('Hash-locked dependency install failed', 'err');
        if (inst.stderr) logInst(inst.stderr, 'err');
        markStep('step-venv', false);
        return;
      }
      logInst('Hash-locked dependencies installed', 'ok');
      markStep('step-venv', true);

      // save config + trust: only newly created engines are owned/deletable
      const next = readUiConfig();
      next.pythonPath = exists(vpy) ? '' : py;
      next.installDir = installDir;
      if (pluginCreatedEngine) {
        markOwnedEngineTrusted(next, installDir);
      } else {
        // Existing / user-managed path: trust for execution only, never claim ownership
        markUserManagedTrusted(next, installDir);
        // Preserve prior ownedInstallPath only if it still matches an external+marker owned engine
        if (next.ownedInstallPath && !canRecursivelyDeleteEngine(next, next.ownedInstallPath)) {
          // if we switched away from owned path, clear deletable record when not the same path
          if (!samePath(next.ownedInstallPath, installDir)) {
            /* keep previous ownedInstallPath for uninstall of old install if still valid */
          }
        }
      }
      applyConfigToUi(next);
      saveConfig(next);

      logInst('=== Done. Run environment check in Settings. ===', 'ok');
      setBadge('ok', 'app.statusReady', true);
      await eagle.notification.show({
        title: t('app.title'),
        body: t('install.installDone'),
        duration: 4000,
      });
    } finally {
      stopBusy();
    }
  }

  async function switchRuntime(mode) {
    // mode: 'gpu' | 'cpu'
    if (!(await assertSupportedPlatformOrExplain(logInst))) return;
    const cfg = readUiConfig();
    if (!isEngineReady(cfg)) {
      logInst(t('errors.engineUntrusted'), 'err');
      return;
    }
    const vpy = venvPython(cfg.taggerRoot);
    if (!exists(vpy)) {
      logInst('venv がありません', 'err');
      return;
    }

    killWorker();
    startBusy(
      mode === 'gpu' ? 'GPU パッケージ導入' : 'CPU に戻す',
      'pip 処理中…'
    );
    logInst(`=== ${mode.toUpperCase()} ランタイムへ切替 ===`, 'info');

    try {
      if (mode === 'gpu') {
        setBusy(null, 'onnxruntime (CPU) を削除中…');
        logInst('onnxruntime (CPU) をアンインストール…', 'info');
        await runCmd(vpy, ['-m', 'pip', 'uninstall', '-y', 'onnxruntime', 'onnxruntime-gpu'], {
          onOut: (t) => { if (t.trim()) logInst(t.trim()); },
          onErr: (t) => { if (t.trim()) logInst(t.trim()); },
        });
        setBusy(null, 'onnxruntime-gpu をインストール中…（時間がかかります）');
        const gpuLock = path.join(cfg.taggerRoot, REQ_LOCKED_GPU);
        const gpuLockSrc = path.join(pluginPythonDir(), REQ_LOCKED_GPU);
        if (!exists(gpuLock) && exists(gpuLockSrc)) {
          try { fs.copyFileSync(gpuLockSrc, gpuLock); } catch {}
        }
        if (!exists(gpuLock)) {
          logInst('Missing GPU lock file ' + REQ_LOCKED_GPU, 'err');
          markStep('step-gpu', false);
          return;
        }
        logInst('Installing hash-locked GPU package (--no-deps)…', 'info');
        const r = await runCmd(vpy, [
          '-m', 'pip', 'install',
          '--disable-pip-version-check',
          '--require-hashes',
          '--no-deps',
          '-r', gpuLock,
        ], {
          onOut: (t) => { if (t.trim()) logInst(t.trim()); },
          onErr: (t) => { if (t.trim()) logInst(t.trim()); },
        });
        if (r.code !== 0) {
          logInst('GPU インストール失敗。CPU lock に戻します。', 'err');
          setBusy(null, 'CPU にフォールバック中…');
          const cpuLock = path.join(cfg.taggerRoot, REQ_LOCKED_CPU);
          if (exists(cpuLock)) {
            await runCmd(vpy, [
              '-m', 'pip', 'install',
              '--disable-pip-version-check',
              '--require-hashes',
              '-r', cpuLock,
            ], {
              onOut: (t) => { if (t.trim()) logInst(t.trim()); },
              onErr: (t) => { if (t.trim()) logInst(t.trim()); },
            });
          }
          markStep('step-gpu', false);
          return;
        }
        // Verify providers from venv
        setBusy(null, 'GPU プロバイダを確認中…');
        const probe = await probeVenvProviders(cfg.taggerRoot);
        logInst('onnxruntime ' + (probe.version || '?') + ' providers: ' + (probe.providers || []).join(', '), 'info');
        if (!probe.ok || !isGpuProviderList(probe.providers)) {
          logInst('GPU パッケージは入ったように見えますが CUDA プロバイダがありません。', 'err');
          logInst('NVIDIA ドライバ / CUDA を確認するか、デバイスを Auto/CPU にしてください。', 'err');
          markStep('step-gpu', false);
          $('deviceSelect').value = 'auto';
        } else {
          logInst('GPU 利用可能: ' + probe.providers.filter((p) => /CUDA|Tensorrt|Dml/i.test(p)).join(', '), 'ok');
          markStep('step-gpu', true);
          $('deviceSelect').value = 'gpu';
        }
        // restart worker so it picks up new package
        killWorker();
        try {
          await ensureWorker(readUiConfig(), { forceRestart: true });
          logInst('Worker を再起動しました（GPU 反映）', 'ok');
        } catch (e) {
          logInst('Worker 再起動: ' + (e.message || e), 'warn');
        }
      } else {
        setBusy(null, 'GPU パッケージを外しています…');
        logInst('GPU パッケージを外し、hash-locked CPU 環境に戻します…', 'info');
        await runCmd(vpy, ['-m', 'pip', 'uninstall', '-y', 'onnxruntime-gpu', 'onnxruntime'], {
          onOut: (t) => { if (t.trim()) logInst(t.trim()); },
          onErr: (t) => { if (t.trim()) logInst(t.trim()); },
        });
        setBusy(null, 'CPU hash-lock をインストール中…');
        let cpuLock = path.join(cfg.taggerRoot, REQ_LOCKED_CPU);
        const cpuLockSrc = path.join(pluginPythonDir(), REQ_LOCKED_CPU);
        if (!exists(cpuLock) && exists(cpuLockSrc)) {
          try { fs.copyFileSync(cpuLockSrc, cpuLock); } catch {}
        }
        if (!exists(cpuLock)) {
          logInst('Missing CPU lock file ' + REQ_LOCKED_CPU, 'err');
          return;
        }
        const r = await runCmd(vpy, [
          '-m', 'pip', 'install',
          '--disable-pip-version-check',
          '--require-hashes',
          '-r', cpuLock,
        ], {
          onOut: (t) => { if (t.trim()) logInst(t.trim()); },
          onErr: (t) => { if (t.trim()) logInst(t.trim()); },
        });
        if (r.code !== 0) {
          logInst('CPU インストール失敗', 'err');
          return;
        }
        logInst('CPU ランタイムへ切替完了', 'ok');
        markStep('step-gpu', false);
        $('deviceSelect').value = 'cpu';
        killWorker();
      }

      saveConfig(readUiConfig());
    } finally {
      stopBusy();
    }
  }

  async function uninstallAll() {
    if (!pluginReady) return;
    const cfg = readUiConfig();
    /**
     * Recursive delete ONLY when ALL agree:
     *  - cfg.ownedInstallPath (outside the target)
     *  - trustedEngine.owned === true for that path
     *  - on-disk marker pluginId + installPath
     *  - exact normalized path + safe target (not home/root/symlink)
     * Marker alone / folder-picker trust never makes a path deletable.
     */
    const targets = [];
    if (cfg.ownedInstallPath && canRecursivelyDeleteEngine(cfg, cfg.ownedInstallPath)) {
      targets.push(path.resolve(cfg.ownedInstallPath));
    } else if (cfg.ownedInstallPath) {
      logInst('Skip uninstall target (ownership checks failed): ' + cfg.ownedInstallPath, 'warn');
    }

    // Shared Hugging Face caches under ~/.cache/huggingface are never scanned or removed.
    if (!targets.length) {
      logInst(t('install.uninstallNone'), 'warn');
      await eagle.dialog.showMessageBox({
        title: t('app.title'),
        message: t('install.uninstallNone'),
        detail: t('install.uninstallSafetyNote'),
        buttons: [t('common.ok')],
        type: 'info',
      });
      return;
    }

    const detailLines = [];
    detailLines.push('[Tagia-owned engine / venv only]');
    targets.forEach((p) => detailLines.push('· ' + p));
    detailLines.push('');
    detailLines.push(t('install.uninstallNoPython'));
    detailLines.push(t('install.uninstallNoHfCache'));
    detailLines.push(t('install.uninstallSafetyNote'));

    const conf = await eagle.dialog.showMessageBox({
      title: t('install.uninstallConfirmTitle'),
      message: t('install.uninstallConfirmMsg'),
      detail: detailLines.join('\n'),
      buttons: [t('common.delete'), t('common.cancel')],
      type: 'warning',
    });
    if (conf.response !== 0) {
      logInst(t('install.uninstallCancel'), 'warn');
      return;
    }

    startBusy(t('install.uninstall'), 'Stopping worker…');
    logInst('=== Uninstall start ===', 'info');

    try {
      killWorker();

      for (const target of targets) {
        // Re-check full ownership gate immediately before delete
        if (!canRecursivelyDeleteEngine(cfg, target)) {
          logInst('Abort delete — ownership checks failed: ' + target, 'err');
          continue;
        }
        setBusy(null, 'Deleting: ' + target);
        logInst('Deleting Tagia-created engine: ' + target, 'info');
        try {
          rmDirRecursive(target);
          if (exists(target)) logInst('Could not fully remove: ' + target, 'err');
          else logInst('Removed: ' + target, 'ok');
        } catch (e) {
          logInst('Delete failed: ' + target + ' / ' + (e.message || e), 'err');
        }
      }

      // reset config paths (keep language + installDir default for next install)
      const prevLang = (cfg && cfg.language) || 'auto';
      const next = defaultConfig();
      next.taggerRoot = '';
      next.pythonPath = '';
      next.ownedInstallPath = '';
      next.trustedEngine = null;
      next.language = prevLang;
      applyConfigToUi(next);
      saveConfig(next);

      markStep('step-clone', false);
      markStep('step-venv', false);
      markStep('step-gpu', false);
      const stillPy = await findWorkingPython(next);
      markStep('step-python', !!stillPy.ok);
      $('stRoot').textContent = '—';
      $('stVenv').textContent = 'なし';
      $('stWorker').textContent = 'stopped';
      $('stModel').textContent = '—';
      $('stProviders').textContent = '—';
      setBadge('warn', 'app.statusSetup', true);

      logInst('=== ' + t('install.uninstallDone') + ' ===', 'ok');
      await eagle.notification.show({
        title: t('app.title'),
        body: t('install.uninstallDone'),
        duration: 3000,
      });
    } finally {
      stopBusy();
    }
  }

  // ---------- UI wiring ----------
  function setupTabs() {
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const id = tab.getAttribute('data-tab');
        switchTab(id);
      });
    });
  }

  async function browseDir(inputId) {
    if (!pluginReady) return;
    const res = await eagle.dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: t('common.selectFolder'),
    });
    if (!res.canceled && res.filePaths && res.filePaths[0]) {
      $(inputId).value = res.filePaths[0];
    }
  }

  /**
   * Fail-closed trust confirmation before executing code from a user-managed (or any) engine.
   */
  async function confirmTrustEngine(enginePath) {
    try {
      if (!pluginReady || !eagle.dialog || !eagle.dialog.showMessageBox) {
        logMain(t('settings.trustEngineDialogFailed'), 'err');
        return false;
      }
      const abs = path.resolve(enginePath);
      const vpy = venvPython(abs);
      const pyLine = exists(vpy) ? vpy : t('settings.trustEngineNoVenv');
      // Folder picker always trusts as user-managed (never deletable ownership)
      const kind = t('settings.trustKindUser');
      const detail = [
        t('settings.trustEngineDetail'),
        '',
        t('settings.trustEnginePathLabel') + ': ' + abs,
        t('settings.trustEnginePythonLabel') + ': ' + pyLine,
        t('settings.trustEngineKindLabel') + ': ' + kind,
        t('settings.trustEngineNotDeleted'),
      ].join('\n');
      const r = await eagle.dialog.showMessageBox({
        title: t('settings.trustEngineTitle'),
        message: t('settings.trustEngineTitle'),
        detail,
        buttons: [t('settings.trustEngineConfirm'), t('common.cancel')],
        type: 'warning',
      });
      if (!r || typeof r.response !== 'number') {
        logMain(t('settings.trustEngineDialogFailed'), 'err');
        return false;
      }
      return r.response === 0;
    } catch (e) {
      logMain(t('settings.trustEngineDialogFailed') + ': ' + (e && e.message ? e.message : e), 'err');
      return false;
    }
  }

  /** Folder picker + explicit trust before adopting a user-managed engine. */
  async function browseAndTrustEngine() {
    if (!pluginReady) return;
    const res = await eagle.dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: t('settings.engineFolder'),
    });
    if (res.canceled || !res.filePaths || !res.filePaths[0]) return;
    const picked = res.filePaths[0];
    if (!isTaggerRoot(picked)) {
      try {
        await eagle.dialog.showMessageBox({
          title: t('app.title'),
          message: t('settings.trustEngineInvalid'),
          detail: t('settings.engineHint'),
          buttons: [t('common.ok')],
          type: 'error',
        });
      } catch {}
      return;
    }
    if (!(await confirmTrustEngine(picked))) {
      logMain(t('settings.trustEngineCancel'), 'warn');
      return;
    }
    $('taggerRoot').value = path.resolve(picked);
    const cfg = readUiConfig();
    // Always user-managed: never ownedInstallPath / never refresh ownership marker
    markUserManagedTrusted(cfg, picked);
    applyConfigToUi(cfg);
    saveConfig(cfg);
    softEnvBadge();
    logMain(t('settings.trustEngineSaved'), 'ok');
    try {
      await eagle.notification.show({
        title: t('app.title'),
        body: t('settings.trustEngineSaved'),
        duration: 3000,
      });
    } catch {}
  }

  async function browseFile(inputId) {
    if (!pluginReady) return;
    const res = await eagle.dialog.showOpenDialog({
      properties: ['openFile'],
      title: t('common.selectPython'),
      filters: process.platform === 'win32'
        ? [{ name: 'Python', extensions: ['exe'] }]
        : undefined,
    });
    if (!res.canceled && res.filePaths && res.filePaths[0]) {
      $(inputId).value = res.filePaths[0];
    }
  }

  function bindEvents() {
    setupTabs();

    $('threshold').addEventListener('input', () => {
      $('thresholdVal').textContent = parseFloat($('threshold').value).toFixed(2);
    });

    $('btnTag').addEventListener('click', () => runTagging());
    $('btnStop').addEventListener('click', () => {
      if (!tagging) return;
      stopRequested = true;
      logMain(t('tag.stopping'), 'warn');
      setProgress(
        0,
        1,
        t('tag.stopping'),
        ''
      );
      // ask worker to stop after current image (best-effort)
      try { writeWorker({ cmd: 'cancel' }); } catch {}
      // hard interrupt current inference so UI does not hang forever
      setTimeout(() => {
        if (tagging && stopRequested) {
          try { killWorker(); } catch {}
        }
      }, 800);
    });
    $('btnRefreshSel').addEventListener('click', () => refreshSelection());
    $('btnWarmup').addEventListener('click', () => warmupModel());

    $('btnSaveSettings').addEventListener('click', async () => {
      const cfg = readUiConfig();
      // Manual path edits without trust picker do not grant execution trust
      if (cfg.taggerRoot && isTaggerRoot(cfg.taggerRoot) && !isEngineTrusted(cfg)) {
        logMain(t('errors.engineUntrusted'), 'warn');
        setBadge('warn', 'app.statusUntrusted', true);
      }
      saveConfig(cfg);
      await applyLanguage(cfg.language);
      softEnvBadge();
      logMain(t('settings.saved'), 'ok');
      eagle.notification.show({ title: t('app.title'), body: t('settings.saved'), duration: 2000 });
    });

    if ($('langSelect')) {
      $('langSelect').addEventListener('change', async () => {
        const pref = $('langSelect').value || 'auto';
        $('langSelect').dataset.pref = pref;
        const cfg = readUiConfig();
        cfg.language = pref;
        saveConfig(cfg);
        await applyLanguage(pref);
        const resolved = resolveLanguage(pref);
        logMain('UI language → ' + resolved + (pref === 'auto' ? ' (auto)' : ''), 'ok');
        // refresh status badge text in new language
        const badge = $('statusText');
        if (badge && isEngineReady(cfg)) {
          setBadge('warn', 'app.statusIdle', true);
        }
      });
    }
    $('btnCheck').addEventListener('click', () => checkEnvironment());
    $('btnRestartWorker').addEventListener('click', async () => {
      try {
        await ensureWorker(readUiConfig(), { forceRestart: true });
        logMain('Worker 再起動完了', 'ok');
      } catch (e) {
        logMain(e.message, 'err');
      }
    });
    $('btnBrowseRoot').addEventListener('click', () => browseAndTrustEngine());
    $('btnBrowsePy').addEventListener('click', () => browseFile('pythonPath'));
    $('btnBrowseInstall').addEventListener('click', () => browseDir('installDir'));

    $('btnInstallAll').addEventListener('click', () => installAll());
    $('btnInstallGpu').addEventListener('click', () => switchRuntime('gpu'));
    $('btnInstallCpu').addEventListener('click', () => switchRuntime('cpu'));
    $('btnUninstall').addEventListener('click', () => uninstallAll());
  }

  // ---------- eagle lifecycle ----------
  // IMPORTANT: eagle.item / dialog / notification only after plugin-create.
  // onPluginRun / onPluginShow can fire before create in some cases.
  eagle.onPluginCreate(async (plugin) => {
    pluginPath = plugin.path || '';
    pluginReady = true;
    const cfg = loadConfig();
    applyConfigToUi(cfg);
    await applyLanguage(cfg.language || 'auto');
    bindEvents();
    logMain(t('common.pluginStart'), 'info');
    logMain('path: ' + pluginPath, 'info');
    if (cfg.taggerRoot) {
      $('stRoot').textContent = cfg.taggerRoot;
    }
    softEnvBadge();
    try {
      await refreshSelection();
    } catch (e) {
      logMain('selection: ' + (e.message || e), 'warn');
    }
    await afterPluginReady();
  });

  eagle.onPluginRun(async () => {
    if (!pluginReady) {
      runPending = true;
      return;
    }
    await refreshSelection();
    softEnvBadge();
  });

  eagle.onPluginShow(async () => {
    if (!pluginReady) {
      showPending = true;
      return;
    }
    await refreshSelection();
  });

  eagle.onPluginBeforeExit(() => {
    pluginReady = false;
    killWorker();
  });
})();
