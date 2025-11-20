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

function upsertSet(set, baseDir = DEFAULT_BASE) {
  const data = loadAll(baseDir);
  const sets = data.sets || [];
  let found = -1;
  if (set.id) {
    found = sets.findIndex(s => s.id === set.id);
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
