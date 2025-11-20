/**
 * Civitai Tag Fetcher
 *
 * CivitaiのModel APIからモデルのtags / trainedWords（トリガーワード）を収集
 * API: https://civitai.com/api/v1/models
 */

const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'PromptClassifier/3.0 (Civitai Fetch)',
        'Accept': 'application/json'
      }
    };
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}`));
        }
      });
    }).on('error', (err) => reject(err));
  });
}

/**
 * 人気順でモデル一覧を取得し、tags / trainedWords / LoRA名を収集
 * @param {Object} opts
 * @param {number} opts.limit - 取得件数
 * @param {string[]} opts.types - 取得対象タイプ（Checkpoint,LORA,TextualInversion）
 */
async function fetchCivitaiData({ limit = 100, types = ['Checkpoint','LORA','TextualInversion'] } = {}) {
  const typeParam = encodeURIComponent(types.join(','));
  let page = 1;
  const pageLimit = Math.min(100, limit); // APIの1ページ上限を想定
  const models = [];

  while (models.length < limit) {
    const url = `https://civitai.com/api/v1/models?limit=${pageLimit}&page=${page}&types=${typeParam}&sort=Most%20Downloaded`;
    const json = await get(url);
    const items = Array.isArray(json.items) ? json.items : [];
    if (items.length === 0) break;
    models.push(...items);
    if (items.length < pageLimit) break;
    page += 1;
  }

  const tagSet = new Set();
  const trainedSet = new Set();
  const loraSet = new Set();

  for (const m of models) {
    // モデルタグ
    (m.tags || []).forEach(t => {
      if (typeof t === 'string' && t.trim()) tagSet.add(t.trim());
    });
    // LoRA/Trigger Words
    (m.modelVersions || []).forEach(v => {
      (v.trainedWords || []).forEach(w => {
        if (typeof w === 'string' && w.trim()) trainedSet.add(w.trim());
      });
      // LORA名（ざっくり）
      if (m.type === 'LORA' && m.name) {
        loraSet.add(m.name.trim());
      }
    });
  }

  return {
    count: models.length,
    tags: Array.from(tagSet),
    trainedWords: Array.from(trainedSet),
    loras: Array.from(loraSet)
  };
}

module.exports = {
  fetchCivitaiData
};
