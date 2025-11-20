const fs = require('fs');
const path = require('path');

const DEFAULT_FALLBACK = path.join('C:', 'metacard', 'prompt-sets');

function readConfigPromptSetsBase() {
  try {
    const cfgPath = path.join(__dirname, '..', 'config.json');
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8')) || {};
      const dirs = cfg.directories || {};
      const val = dirs.promptSets || dirs['prompt-sets'];
      if (val && typeof val === 'string' && val.trim()) return val.trim();
    }
  } catch {}
  return null;
}

const DEFAULT_BASE = (process.env.PROMPT_SETS_DIR && String(process.env.PROMPT_SETS_DIR).trim())
  || readConfigPromptSetsBase()
  || DEFAULT_FALLBACK;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function safeBase(base) {
  try {
    ensureDir(base);
    return base;
  } catch {
    const fallback = path.join(__dirname, '..', 'prompt-sets');
    ensureDir(fallback);
    return fallback;
  }
}

function loadAll(baseDir = DEFAULT_BASE) {
  const base = safeBase(baseDir);
  const file = path.join(base, 'sets.json');
  if (!fs.existsSync(file)) {
    return { version: '1.0', updatedAt: new Date().toISOString(), sets: [] };
  }
  try {
    const content = fs.readFileSync(file, 'utf-8');
    const json = JSON.parse(content);
    if (!json.sets) json.sets = [];
    return json;
  } catch {
    return { version: '1.0', updatedAt: new Date().toISOString(), sets: [] };
  }
}

function saveAll(data, baseDir = DEFAULT_BASE) {
  const base = safeBase(baseDir);
  const file = path.join(base, 'sets.json');
  data.updatedAt = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
  return file;
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * セット登録数の制限チェック
 * 配布版では初期セット数+2個まで登録可能
 */
function checkSetLimit(isNewSet, currentCount) {
  // 開発環境判定（LICENSE_TYPE環境変数が設定されていない場合）
  const isDevelopment = !process.env.LICENSE_TYPE;

  if (isDevelopment) {
    // 開発環境では制限なし
    return { allowed: true };
  }

  // 配布版のみ制限適用
  const licenseType = process.env.LICENSE_TYPE;

  // trial版とfree版のみ制限
  if (licenseType === 'trial' || licenseType === 'free') {
    // 新規追加の場合のみチェック
    if (isNewSet) {
      // 初期セット数を取得（初回起動時に保存される）
      const initialCount = getInitialSetCount();
      const maxAllowed = initialCount + 2;

      if (currentCount >= maxAllowed) {
        return {
          allowed: false,
          message: `セット登録数の上限に達しました。\n${licenseType === 'trial' ? 'トライアル版' : '無料版'}では初期セット数+2個まで登録可能です。\n（現在: ${currentCount}/${maxAllowed}個）`
        };
      }
    }
  }

  return { allowed: true };
}

/**
 * 初期セット数を取得
 * 初回起動時に保存された値を返す
 */
function getInitialSetCount() {
  try {
    const { app } = require('electron');
    const initialCountFile = path.join(app.getPath('userData'), 'initial_set_count.json');

    if (fs.existsSync(initialCountFile)) {
      const data = JSON.parse(fs.readFileSync(initialCountFile, 'utf-8'));
      return data.count || 0;
    }

    // 初回起動時は現在のセット数を保存
    const currentData = loadAll(DEFAULT_BASE);
    const currentCount = (currentData.sets || []).length;

    fs.writeFileSync(initialCountFile, JSON.stringify({
      count: currentCount,
      savedAt: new Date().toISOString()
    }, null, 2), 'utf-8');

    console.log(`✅ 初期セット数を保存: ${currentCount}個`);
    return currentCount;
  } catch (error) {
    console.warn('初期セット数の取得に失敗（制限なしで動作）:', error.message);
    return 0; // エラー時は制限なし
  }
}

function upsertSet(set, baseDir = DEFAULT_BASE) {
  const data = loadAll(baseDir);
  const sets = data.sets || [];
  let found = -1;
  if (set.id) {
    found = sets.findIndex(s => s.id === set.id);
  }

  const isNewSet = found < 0;
  const currentCount = sets.length;

  // セット登録数制限チェック
  const limitCheck = checkSetLimit(isNewSet, currentCount);
  if (!limitCheck.allowed) {
    throw new Error(limitCheck.message);
  }

  const now = new Date().toISOString();
  const record = {
    id: set.id || uuid(),
    name: set.name || 'Untitled',
    description: set.description || '',
    labels: Array.isArray(set.labels) ? set.labels : [],
    categories: Array.isArray(set.categories) ? set.categories : [],
    tagsByCategory: set.tagsByCategory || {},
    thumbnailPath: set.thumbnailPath || '',
    createdAt: set.createdAt || now,
    updatedAt: now,
    author: set.author || '',
    source: set.source || {},
    stats: set.stats || { useCount: 0, lastUsedAt: null }
  };
  if (found >= 0) {
    sets[found] = record;
  } else {
    sets.push(record);
  }
  data.sets = sets;
  saveAll(data, baseDir);
  return record;
}

function deleteSet(id, baseDir = DEFAULT_BASE) {
  const data = loadAll(baseDir);
  const sets = data.sets || [];
  const idx = sets.findIndex(s => s.id === id);
  if (idx >= 0) {
    // delete thumbnail if exists
    const base = safeBase(baseDir);
    const thumbPath = sets[idx].thumbnailPath;
    if (thumbPath) {
      const full = path.isAbsolute(thumbPath) ? thumbPath : path.join(base, thumbPath);
      try { if (fs.existsSync(full)) fs.unlinkSync(full); } catch {}
    }
    sets.splice(idx, 1);
    data.sets = sets;
    saveAll(data, baseDir);
    return true;
  }
  return false;
}

function saveThumbnail(base64DataUrl, id, baseDir = DEFAULT_BASE) {
  if (!base64DataUrl) return '';
  const base = safeBase(baseDir);
  ensureDir(path.join(base, 'thumbnails'));
  const m = base64DataUrl.match(/^data:(image\/png|image\/jpeg);base64,(.+)$/);
  if (!m) return '';
  const ext = m[1] === 'image/png' ? 'png' : 'jpg';
  const buf = Buffer.from(m[2], 'base64');
  const rel = path.join('thumbnails', `${id}.${ext}`);
  const full = path.join(base, rel);
  fs.writeFileSync(full, buf);
  return rel;
}

module.exports = {
  DEFAULT_BASE,
  loadAll,
  saveAll,
  upsertSet,
  deleteSet,
  saveThumbnail,
  uuid,
};
