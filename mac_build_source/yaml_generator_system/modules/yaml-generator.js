/**
 * YAML生成ロジックモジュール
 * 分類結果からStabilityMatrix互換のYAMLワイルドカードを生成
 */

/**
 * 分類結果からYAML形式の文字列を生成
 * @param {Array} classifiedLines - 分類結果の配列 [{ lineNumber, originalLine, classified }, ...]
 * @returns {string} - YAML形式の文字列
 */
function generateYAML(classifiedLines) {
  // セクションごとのエントリーを初期化
  const yamlSections = {
    character_main: [],
    characterface: [],
    clothing: [],
    poseemotion: [],
    backgrounds: [],
    characterbody: [],
    uncategorized: []
  };
  
  // character_mainテンプレートを追加
  yamlSections.character_main.push(
    '1girl, solo, __characterface__, __characterbody__, __clothing__, __poseemotion__, __backgrounds__, __uncategorized__'
  );
  
  // 各行を分類して各セクションに追加
  classifiedLines.forEach(({ classified }) => {
    Object.keys(yamlSections).forEach(category => {
      if (category === 'character_main') return;
      
      const tags = classified[category] || [];
      if (tags.length > 0) {
        // カンマ区切りでタグを結合し、ダブルクォートで囲む
        const tagString = tags.join(', ');
        yamlSections[category].push(`"${tagString}"`);
      }
    });
  });
  
  // YAML形式にフォーマット
  let yamlContent = '';
  const sectionOrder = ['character_main', 'characterface', 'clothing', 'poseemotion', 'backgrounds', 'characterbody', 'uncategorized'];
  
  sectionOrder.forEach(section => {
    if (yamlSections[section].length > 0) {
      yamlContent += `${section}:\n`;
      yamlSections[section].forEach(item => {
        yamlContent += `  - ${item}\n`;
      });
      yamlContent += '\n';
    }
  });
  
  return yamlContent.trim();
}

/**
 * 選択されたカードからYAMLを生成
 * @param {Array} selectedCards - 選択されたカードの配列 [{ lineNumber, category, tags }, ...]
 * @param {Array} allClassifiedLines - 全分類結果の配列
 * @returns {string} - YAML形式の文字列
 */
function generateYAMLFromSelectedCards(selectedCards, allClassifiedLines) {
  // 選択されたカードに対応する分類結果を取得
  const selectedLines = selectedCards.map(card => {
    const lineData = allClassifiedLines.find(l => l.lineNumber === card.lineNumber);
    if (!lineData) return null;
    
    // 選択されたカテゴリのタグのみを含む分類結果を作成
    const classified = {
      characterface: [],
      clothing: [],
      poseemotion: [],
      backgrounds: [],
      characterbody: [],
      uncategorized: []
    };
    
    // 選択されたカテゴリのタグを追加
    if (card.category && lineData.classified[card.category]) {
      classified[card.category] = [...lineData.classified[card.category]];
    }
    
    return {
      lineNumber: card.lineNumber,
      originalLine: lineData.originalLine,
      classified
    };
  }).filter(item => item !== null);
  
  return generateYAML(selectedLines);
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateYAML,
    generateYAMLFromSelectedCards
  };
} else {
  // ブラウザ環境
  window.YAMLGenerator = {
    generateYAML,
    generateYAMLFromSelectedCards
  };
}

