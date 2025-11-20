/**
 * UI描画ロジックモジュール
 * カードグリッド、カテゴリタブ、統計表示などを描画
 */

/**
 * カテゴリタブを描画
 * @param {HTMLElement} container - コンテナ要素
 * @param {string} activeCategory - アクティブなカテゴリ
 * @param {Function} onCategoryChange - カテゴリ変更時のコールバック
 */
function renderCategoryTabs(container, activeCategory, onCategoryChange) {
  const categories = [
    { key: 'characterface', label: '😊 顔', icon: '😊' },
    { key: 'clothing', label: '👗 服装', icon: '👗' },
    { key: 'poseemotion', label: '🤸 ポーズ', icon: '🤸' },
    { key: 'backgrounds', label: '🏞️ 背景', icon: '🏞️' },
    { key: 'characterbody', label: '💃 体', icon: '💃' },
    { key: 'expression', label: '😊 表情', icon: '😊' },
    { key: 'uncategorized', label: '📦 その他', icon: '📦' }
  ];
  
  container.innerHTML = '';
  
  categories.forEach(category => {
    const tab = document.createElement('button');
    tab.textContent = category.label;
    tab.dataset.category = category.key;
    tab.style.cssText = `
      padding: 10px 15px;
      margin-right: 8px;
      margin-bottom: 8px;
      background: ${activeCategory === category.key ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255,255,255,0.9)'};
      color: ${activeCategory === category.key ? 'white' : '#333'};
      border: 2px solid ${activeCategory === category.key ? '#667eea' : '#dee2e6'};
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: bold;
      transition: all 0.3s;
    `;
    
    tab.addEventListener('click', () => {
      onCategoryChange(category.key);
    });
    
    container.appendChild(tab);
  });
}

/**
 * カードを描画
 * @param {HTMLElement} container - コンテナ要素
 * @param {Array} cards - カードデータの配列
 * @param {Set} selectedCardIds - 選択されたカードIDのセット
 * @param {Function} onCardClick - カードクリック時のコールバック
 */
function renderCards(container, cards, selectedCardIds, onCardClick) {
  container.innerHTML = '';
  
  if (cards.length === 0) {
    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #999; padding: 60px; font-size: 18px; font-weight: bold;">カードがありません</div>';
    return;
  }
  
  cards.forEach((card, index) => {
    const cardId = card.id || card.setName;
    const cardElement = document.createElement('div');
    cardElement.dataset.cardId = cardId;
    const isSelected = selectedCardIds.has(card.id) || selectedCardIds.has(card.setName) || selectedCardIds.has(cardId);
    cardElement.style.cssText = `
      position: relative;
      width: 160px;
      height: 200px;
      background: ${isSelected ? 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' : 'white'};
      border: ${isSelected ? '3px solid #667eea' : '2px solid #dee2e6'};
      border-radius: 10px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: ${isSelected ? '0 4px 12px rgba(102, 126, 234, 0.3)' : '0 2px 6px rgba(0,0,0,0.1)'};
      display: flex;
      flex-direction: column;
    `;
    
    // 選択バッジ
    const cardId = card.id || card.setName;
    if (isSelected) {
      const badge = document.createElement('div');
      const selectedArray = Array.from(selectedCardIds);
      const selectedIndex = selectedArray.findIndex(id => id === card.id || id === card.setName || id === cardId) + 1;
      badge.textContent = selectedIndex;
      badge.style.cssText = `
        position: absolute;
        top: 5px;
        right: 5px;
        width: 24px;
        height: 24px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        z-index: 10;
      `;
      cardElement.appendChild(badge);
    }
    
    // セット名表示（行番号の代わり）
    if (card.setName) {
      const setName = document.createElement('div');
      setName.textContent = card.setName;
      setName.style.cssText = `
        position: absolute;
        top: 5px;
        left: 5px;
        background: rgba(0,0,0,0.6);
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: bold;
        z-index: 10;
        max-width: 140px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      `;
      cardElement.appendChild(setName);
    } else if (card.lineNumber) {
      // 行番号表示（分類結果の場合）
      const lineNumber = document.createElement('div');
      lineNumber.textContent = `#${card.lineNumber}`;
      lineNumber.style.cssText = `
        position: absolute;
        top: 5px;
        left: 5px;
        background: rgba(0,0,0,0.6);
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: bold;
        z-index: 10;
      `;
      cardElement.appendChild(lineNumber);
    }
    
    // サムネイル画像
    const img = document.createElement('img');
    if (card.thumbnail && card.setData && window.electronAPI && window.electronAPI.loadSetImage) {
      // セットデータから画像を読み込む
      window.electronAPI.loadSetImage(card.thumbnail).then(result => {
        if (result && result.success && result.dataUrl) {
          img.src = result.dataUrl;
        } else {
          img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="140"><rect width="160" height="140" fill="%23f5f7fa"/><text x="80" y="60" text-anchor="middle" fill="%23999" font-size="12">No Image</text></svg>';
        }
      }).catch(() => {
        img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="140"><rect width="160" height="140" fill="%23f5f7fa"/><text x="80" y="60" text-anchor="middle" fill="%23999" font-size="12">No Image</text></svg>';
      });
    } else {
      img.src = card.thumbnail || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="140"><rect width="160" height="140" fill="%23f5f7fa"/><text x="80" y="60" text-anchor="middle" fill="%23999" font-size="12">No Image</text></svg>';
    }
    img.style.cssText = 'width: 100%; height: 140px; object-fit: cover; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);';
    img.onerror = () => {
      img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="140"><rect width="160" height="140" fill="%23ffe0e0"/><text x="80" y="60" text-anchor="middle" fill="%23d63031" font-size="12">画像なし</text></svg>';
    };
    cardElement.appendChild(img);
    
    // タグ表示
    const tagContainer = document.createElement('div');
    tagContainer.style.cssText = 'padding: 8px; font-size: 11px; color: #2d3436; line-height: 1.4; max-height: 60px; overflow: hidden;';
    const tagsText = card.tags.slice(0, 5).join(', '); // 最大5タグまで表示
    tagContainer.textContent = tagsText + (card.tags.length > 5 ? '...' : '');
    cardElement.appendChild(tagContainer);
    
    // クリックイベント
    cardElement.addEventListener('click', () => {
      onCardClick(card.id || card.setName);
    });
    
    container.appendChild(cardElement);
  });
}

/**
 * 統計情報を描画
 * @param {HTMLElement} container - コンテナ要素
 * @param {Object} stats - 統計情報
 */
function renderStatistics(container, stats) {
  container.innerHTML = '';
  
  const statsHTML = `
    <div style="padding: 15px; background: rgba(255,255,255,0.9); border-radius: 8px; margin-bottom: 15px;">
      <h4 style="margin: 0 0 10px 0; color: #2d3436; font-size: 16px;">📊 統計</h4>
      <div style="font-size: 13px; color: #495057; line-height: 1.8;">
        <div>総行数: <strong>${stats.totalLines || 0}</strong></div>
        <div>分類済み: <strong>${stats.classifiedLines || 0}</strong></div>
        <div>選択中: <strong>${stats.selectedCards || 0}</strong></div>
      </div>
    </div>
    <div style="padding: 15px; background: rgba(255,255,255,0.9); border-radius: 8px;">
      <h4 style="margin: 0 0 10px 0; color: #2d3436; font-size: 16px;">📑 カテゴリ別</h4>
      <div style="font-size: 12px; color: #495057; line-height: 1.6;">
        <div>😊 顔: <strong>${stats.characterface || 0}</strong></div>
        <div>👗 服装: <strong>${stats.clothing || 0}</strong></div>
        <div>🤸 ポーズ: <strong>${stats.poseemotion || 0}</strong></div>
        <div>🏞️ 背景: <strong>${stats.backgrounds || 0}</strong></div>
        <div>💃 体: <strong>${stats.characterbody || 0}</strong></div>
        <div>😊 表情: <strong>${stats.expression || 0}</strong></div>
        <div>📦 その他: <strong>${stats.uncategorized || 0}</strong></div>
      </div>
    </div>
  `;
  
  container.innerHTML = statsHTML;
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    renderCategoryTabs,
    renderCards,
    renderStatistics
  };
} else {
  // ブラウザ環境
  window.UIRenderer = {
    renderCategoryTabs,
    renderCards,
    renderStatistics
  };
}

