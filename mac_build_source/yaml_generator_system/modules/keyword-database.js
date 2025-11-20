/**
 * キーワード辞書モジュール
 * 既存の辞書ファイル（dictionaries/）から読み込んで、YAML生成システム用のカテゴリにマッピング
 */

// YAML生成システムのカテゴリマッピング
const CATEGORY_MAPPING = {
  'face.md': 'characterface',
  'body.md': 'characterbody',
  'clothing.md': 'clothing',
  'pose.md': 'poseemotion',
  'expression.md': 'poseemotion', // 表情もポーズ・表情カテゴリに
  'background.md': 'backgrounds',
  'quality.md': 'uncategorized', // 品質タグはその他に
  'other.md': 'uncategorized'
};

/**
 * Markdown辞書ファイルからタグを抽出
 * @param {string} content - Markdownファイルの内容
 * @returns {string[]} - 抽出されたタグの配列
 */
function parseDictionary(content) {
  const lines = content.split('\n');
  const tags = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    // "- tag" 形式を抽出
    if (trimmed.startsWith('- ')) {
      const tag = trimmed.substring(2).trim();
      if (tag.length > 0) {
        tags.push(tag.toLowerCase()); // 小文字化して保存
      }
    }
  }
  
  return tags;
}

/**
 * キーワード辞書を初期化
 * @returns {Promise<Object>} - カテゴリごとのキーワード配列
 */
async function initializeKeywordDatabase() {
  const keywordDatabase = {
    characterface: [],
    clothing: [],
    poseemotion: [],
    backgrounds: [],
    characterbody: [],
    uncategorized: []
  };
  
  // 既存の辞書ファイルを読み込む
  const dictionaryFiles = [
    'face.md',
    'body.md',
    'clothing.md',
    'pose.md',
    'expression.md',
    'background.md',
    'quality.md'
  ];
  
  try {
    // Electron APIを使用して辞書ファイルを読み込む
    if (window.electronAPI && window.electronAPI.readDictionaryFile) {
      for (const filename of dictionaryFiles) {
        const category = CATEGORY_MAPPING[filename] || 'uncategorized';
        
        try {
          const result = await window.electronAPI.readDictionaryFile(filename);
          if (result.success && result.content) {
            const tags = parseDictionary(result.content);
            keywordDatabase[category] = [...new Set([...keywordDatabase[category], ...tags])];
            console.log(`✅ ${filename} → ${category}: ${tags.length}タグ読み込み`);
          }
        } catch (error) {
          console.warn(`⚠️ ${filename} 読み込み失敗:`, error);
        }
      }
    } else {
      // Electron APIが利用できない場合、デフォルトのキーワードを使用
      console.warn('⚠️ Electron APIが利用できません。デフォルトキーワードを使用します。');
      keywordDatabase = getDefaultKeywords();
    }
  } catch (error) {
    console.error('❌ キーワード辞書初期化エラー:', error);
    keywordDatabase = getDefaultKeywords();
  }
  
  return keywordDatabase;
}

/**
 * デフォルトのキーワード辞書（Electron APIが利用できない場合のフォールバック）
 * @returns {Object} - カテゴリごとのキーワード配列
 */
function getDefaultKeywords() {
  return {
    characterface: [
      'long hair', 'short hair', 'twin braids', 'ponytail', 'braid',
      'blue eyes', 'red eyes', 'green eyes', 'heterochromia',
      'blonde hair', 'black hair', 'pink hair', 'white hair',
      'sharp eyes', 'tareme', 'tsurime',
      'lips', 'lipstick', 'open mouth', 'bangs', 'medium hair'
    ],
    clothing: [
      'dress', 'skirt', 'shirt', 'bikini', 'school uniform', 'kimono',
      'necklace', 'earrings', 'bracelet',
      'underwear', 'bra', 'panties', 'uniform', 'shorts'
    ],
    poseemotion: [
      'smile', 'angry', 'embarrassed', 'surprised', 'blush',
      'standing', 'sitting', 'lying', 'bent over', 'all fours',
      'running', 'jumping', 'reaching', 'stretching',
      'looking at viewer', 'looking back', 'kneeling', 'squatting'
    ],
    backgrounds: [
      'classroom', 'beach', 'garden', 'bedroom', 'street',
      'indoors', 'outdoors', 'night', 'sunset', 'outdoor'
    ],
    characterbody: [
      'petite', 'curvy', 'muscular', 'tall', 'short',
      'pale skin', 'dark skin', 'tan',
      'large breasts', 'small breasts', 'cleavage', 'breasts'
    ],
    uncategorized: []
  };
}

/**
 * タグを分類する
 * @param {string} tag - 分類するタグ
 * @param {Object} keywordDatabase - キーワード辞書
 * @returns {string} - カテゴリ名（characterface, clothing, poseemotion, backgrounds, characterbody, uncategorized）
 */
function classifyTag(tag, keywordDatabase) {
  const normalizedTag = tag.trim().toLowerCase();
  
  if (!normalizedTag) {
    return 'uncategorized';
  }
  
  // 各カテゴリを順番にチェック（最初にマッチしたカテゴリに分類）
  const categoryOrder = ['characterface', 'clothing', 'poseemotion', 'backgrounds', 'characterbody'];
  
  for (const category of categoryOrder) {
    if (keywordDatabase[category] && keywordDatabase[category].includes(normalizedTag)) {
      return category;
    }
  }
  
  // マッチしなかった場合
  return 'uncategorized';
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeKeywordDatabase,
    classifyTag,
    getDefaultKeywords,
    parseDictionary
  };
} else {
  // ブラウザ環境
  window.KeywordDatabase = {
    initializeKeywordDatabase,
    classifyTag,
    getDefaultKeywords,
    parseDictionary
  };
}

