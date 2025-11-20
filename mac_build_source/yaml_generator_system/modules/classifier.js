/**
 * 分類エンジンモジュール
 * プロンプトテキストをカテゴリごとに分類する
 */

/**
 * 1行のプロンプトを分類する
 * @param {string} line - プロンプト行（カンマ区切り）
 * @param {Object} keywordDatabase - キーワード辞書
 * @returns {Object} - カテゴリごとのタグ配列
 */
function classifyLine(line, keywordDatabase) {
  // タグをカンマで分割
  const tags = line.split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
  
  // カテゴリごとに分類
  const classified = {
    characterface: [],
    clothing: [],
    poseemotion: [],
    backgrounds: [],
    characterbody: [],
    uncategorized: []
  };
  
  tags.forEach(tag => {
    const category = classifyTag(tag, keywordDatabase);
    if (category && classified[category]) {
      // 重複を避ける（行ごとに）
      if (!classified[category].includes(tag)) {
        classified[category].push(tag);
      }
    } else {
      // カテゴリが見つからない場合、uncategorizedに追加
      if (!classified.uncategorized.includes(tag)) {
        classified.uncategorized.push(tag);
      }
    }
  });
  
  return classified;
}

/**
 * 複数行のプロンプトを分類する（YAML生成用）
 * @param {string} content - プロンプトテキスト（複数行）
 * @param {Object} keywordDatabase - キーワード辞書
 * @returns {Array} - 各行の分類結果の配列
 */
function classifyFileForYAML(content, keywordDatabase) {
  console.log('🔍 classifyFileForYAML 開始:', {
    contentLength: content.length,
    keywordDatabaseExists: !!keywordDatabase,
    keywordDatabaseKeys: keywordDatabase ? Object.keys(keywordDatabase) : null
  });
  
  const lines = content.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  console.log('📝 行数:', lines.length, 'サンプル:', lines.slice(0, 3));
  
  const result = lines.map((line, index) => {
    const classified = classifyLine(line, keywordDatabase);
    return {
      lineNumber: index + 1,
      originalLine: line,
      classified: classified
    };
  });
  
  console.log('✅ classifyFileForYAML 完了:', {
    resultLength: result.length,
    sampleResult: result[0]
  });
  
  return result;
}

/**
 * 複数ファイルから特定カテゴリのタグを抽出する（テキスト抽出用）
 * @param {Array} fileContents - ファイル内容の配列 [{ filePath, content }, ...]
 * @param {Array} selectedCategories - 抽出するカテゴリの配列
 * @param {Object} keywordDatabase - キーワード辞書
 * @returns {Array} - 各ファイルの抽出結果 [{ filePath, extractedTags }, ...]
 */
function extractCategoriesFromFiles(fileContents, selectedCategories, keywordDatabase) {
  return fileContents.map(({ filePath, content }) => {
    const lines = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    // 全行から選択されたカテゴリのタグを抽出
    const extractedTags = [];
    
    lines.forEach(line => {
      const classified = classifyLine(line, keywordDatabase);
      
      selectedCategories.forEach(category => {
        if (classified[category] && classified[category].length > 0) {
          extractedTags.push(...classified[category]);
        }
      });
    });
    
    // 重複を除去（ファイルごと）
    const uniqueTags = [...new Set(extractedTags)];
    
    return {
      filePath,
      extractedTags: uniqueTags
    };
  });
}

/**
 * タグを分類する（keyword-database.jsのclassifyTagを使用）
 * @param {string} tag - 分類するタグ
 * @param {Object} keywordDatabase - キーワード辞書
 * @returns {string} - カテゴリ名
 */
function classifyTag(tag, keywordDatabase) {
  if (window.KeywordDatabase && window.KeywordDatabase.classifyTag) {
    return window.KeywordDatabase.classifyTag(tag, keywordDatabase);
  }
  
  // フォールバック
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
    classifyLine,
    classifyFileForYAML,
    extractCategoriesFromFiles,
    classifyTag
  };
} else {
  // ブラウザ環境
  window.Classifier = {
    classifyLine,
    classifyFileForYAML,
    extractCategoriesFromFiles,
    classifyTag
  };
}

