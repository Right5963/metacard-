/**
 * YAML生成システム メインロジック
 * オーケストレーターとして各モジュールを統合
 */

// グローバル状態
const yamlGeneratorState = {
  mode: 'yaml', // 'yaml' または 'extract'
  keywordDatabase: null,
  filePath: null,
  folderPath: null,
  classifiedLines: [], // [{ lineNumber, originalLine, classified, thumbnail }, ...]
  selectedCards: new Set(), // 選択されたカードIDのセット
  activeCategory: 'characterface', // 現在表示中のカテゴリ
  extractionResults: [], // テキスト抽出モード用
  selectedCategories: new Set(), // テキスト抽出モード用の選択カテゴリ
  selectedGroup: '', // 選択されたグループ（フィルター用）
  selectedSection: '', // 選択されたセッション（フィルター用）
  setsData: {
    face: {},
    body: {},
    background: {},
    clothing: {},
    expression: {},
    pose: { groups: {} }
  } // セットデータ（ストーリープロンプトと同じ構造）
};

/**
 * システム初期化（ストーリープロンプトと同じシンプルな仕組み）
 */
async function initializeYAMLGenerator() {
  console.log('📄 YAML生成システム初期化開始');
  
  // キーワードデータベースを初期化（テキスト抽出用）
  if (!yamlGeneratorState.keywordDatabase && window.KeywordDatabase) {
    console.log('📚 キーワードデータベース初期化中...');
    yamlGeneratorState.keywordDatabase = await window.KeywordDatabase.initializeKeywordDatabase();
    console.log('✅ キーワードデータベース初期化完了');
  }
  
  // セットデータを読み込む（ストーリープロンプトと同じ仕組み）
  await loadYAMLGeneratorSets();
  
  console.log('✅ YAML生成システム初期化完了');
}

/**
 * セットデータを読み込む（ストーリープロンプトと同じ仕組み）
 */
async function loadYAMLGeneratorSets() {
  console.log('📚 YAML生成システム: セットデータ読み込み開始');
  const categories = ['face', 'body', 'background', 'clothing', 'expression', 'pose'];
  
  yamlGeneratorState.setsData = {
    face: { groups: {} },
    body: { groups: {} },
    background: { groups: {} },
    clothing: { groups: {} },
    expression: { groups: {} },
    pose: { groups: {} }
  };
  
  for (const category of categories) {
    try {
      if (window.electronAPI && window.electronAPI.loadCategorySets) {
        const result = await window.electronAPI.loadCategorySets(category);
        
        if (result && result.success && result.groups) {
          // 全てのカテゴリで階層構造を保持（フィルター機能のため）
          yamlGeneratorState.setsData[category] = { groups: result.groups };
          const groupCount = Object.keys(result.groups).length;
          let totalSets = 0;
          Object.values(result.groups).forEach(groupData => {
            if (groupData.sections) {
              Object.values(groupData.sections).forEach(sets => {
                totalSets += Object.keys(sets).length;
              });
            }
          });
          console.log(`✅ ${category}: グループ数 ${groupCount}, セット数 ${totalSets}`);
        }
      }
    } catch (error) {
      console.error(`❌ ${category} 読み込みエラー:`, error);
    }
  }
  
  console.log('✅ YAML生成システム: セットデータ読み込み完了');
}

/**
 * ファイルを選択して分類実行
 */
async function selectAndClassifyFile() {
  try {
    if (!window.electronAPI || !window.electronAPI.selectTextFile) {
      alert('ファイル選択機能が利用できません');
      return;
    }
    
    const filePath = await window.electronAPI.selectTextFile();
    if (!filePath) {
      return; // キャンセル
    }
    
    yamlGeneratorState.filePath = filePath;
    
    // ファイルを読み込む
    console.log('📁 ファイル読み込み開始:', filePath);
    const content = await window.FileHandler.readTextFile(filePath);
    console.log('✅ ファイル読み込み完了:', content.length, '文字');
    
    // 分類実行
    console.log('🔍 分類実行開始...');
    await classifyFile(content);
    console.log('✅ 分類完了:', yamlGeneratorState.classifiedLines.length, '行');
    console.log('📊 分類結果サンプル:', yamlGeneratorState.classifiedLines.slice(0, 3));
    
    // UI更新
    console.log('🎨 UI更新開始...');
    updateUI();
    console.log('✅ UI更新完了');
    
    // 統計を更新
    const statsContainer = document.getElementById('yamlFileStats');
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div>総行数: <strong>${yamlGeneratorState.classifiedLines.length}</strong></div>
        <div>分類済み: <strong>${yamlGeneratorState.classifiedLines.length}</strong></div>
      `;
    }
    
    alert(`✅ 分類完了: ${yamlGeneratorState.classifiedLines.length}行`);
  } catch (error) {
    console.error('❌ ファイル選択エラー:', error);
    alert(`❌ エラー: ${error.message}`);
  }
}

/**
 * ファイル内容を分類
 */
async function classifyFile(content) {
  if (!yamlGeneratorState.keywordDatabase) {
    await initializeYAMLGenerator();
  }
  
  // 分類実行
  if (!window.Classifier) {
    throw new Error('Classifierモジュールが見つかりません');
  }
  
  if (!yamlGeneratorState.keywordDatabase) {
    throw new Error('キーワード辞書が初期化されていません');
  }
  
  console.log('🔍 分類実行:', {
    contentLength: content.length,
    keywordDatabaseKeys: Object.keys(yamlGeneratorState.keywordDatabase),
    keywordDatabaseSizes: Object.keys(yamlGeneratorState.keywordDatabase).map(k => ({
      category: k,
      count: yamlGeneratorState.keywordDatabase[k].length
    }))
  });
  
  const classifiedResult = window.Classifier.classifyFileForYAML(
    content,
    yamlGeneratorState.keywordDatabase
  );
  
  console.log('📊 分類結果（分類直後）:', {
    totalLines: classifiedResult.length,
    sampleLine: classifiedResult[0],
    sampleLineClassified: classifiedResult[0]?.classified
  });
  
  yamlGeneratorState.classifiedLines = classifiedResult;
  
  console.log('📊 分類結果（保存後）:', {
    totalLines: yamlGeneratorState.classifiedLines.length,
    stateCheck: yamlGeneratorState.classifiedLines === classifiedResult
  });
  
  // サムネイル画像を取得
  console.log('🖼️ サムネイル画像取得開始...');
  yamlGeneratorState.classifiedLines = await attachThumbnails(yamlGeneratorState.classifiedLines);
  console.log('✅ サムネイル画像取得完了');
  
  // カードIDを付与
  yamlGeneratorState.classifiedLines.forEach((line, index) => {
    line.id = `card_${line.lineNumber}`;
  });
  
  console.log(`✅ 分類完了: ${yamlGeneratorState.classifiedLines.length}行`);
}

/**
 * サムネイル画像を取得して付与
 */
async function attachThumbnails(classifiedLines) {
  // 既に読み込んだセットデータを使用（なければ読み込む）
  if (!yamlGeneratorState.setDataForThumbnails || Object.keys(yamlGeneratorState.setDataForThumbnails).length === 0) {
    await loadSetDataForThumbnails();
  }
  
  const allSetsData = yamlGeneratorState.setDataForThumbnails;
  
  // 各行にサムネイル画像を付与（非同期処理）
  const linesWithThumbnails = await Promise.all(classifiedLines.map(async (line) => {
    let thumbnail = null;
    
    // 各カテゴリのタグから最もマッチするセットを検索
    const categoryMapping = {
      characterface: 'face',
      characterbody: 'body',
      backgrounds: 'background',
      clothing: 'clothing',
      poseemotion: 'pose',
      uncategorized: null
    };
    
    // 最もタグが多いカテゴリを優先
    let bestMatch = null;
    let bestMatchCount = 0;
    
    Object.keys(line.classified).forEach(category => {
      const tags = line.classified[category] || [];
      if (tags.length === 0) return;
      
      const mappedCategory = categoryMapping[category];
      if (!mappedCategory || !allSetsData[mappedCategory]) return;
      
      // セットを検索（タグの一致度で判定）
      Object.keys(allSetsData[mappedCategory]).forEach(setName => {
        const set = allSetsData[mappedCategory][setName];
        const setTags = set.tags || [];
        
        // タグの一致数をカウント
        const matchCount = tags.filter(tag => 
          setTags.some(setTag => setTag.toLowerCase() === tag.toLowerCase())
        ).length;
        
        if (matchCount > bestMatchCount && set.image) {
          bestMatchCount = matchCount;
          bestMatch = {
            image: set.image,
            category: mappedCategory
          };
        }
      });
    });
    
    // サムネイル画像のパスを構築
    if (bestMatch && bestMatch.image) {
      const imageName = bestMatch.image;
      
      // loadSetImageを使用してdata URLを取得
      try {
        if (window.electronAPI && window.electronAPI.loadSetImage) {
          const imageResult = await window.electronAPI.loadSetImage(imageName);
          if (imageResult && imageResult.success && imageResult.dataUrl) {
            thumbnail = imageResult.dataUrl;
          }
        }
      } catch (error) {
        console.warn(`画像読み込みエラー (${imageName}):`, error);
      }
    }
    
    return {
      ...line,
      thumbnail: thumbnail
    };
  }));
  
  return linesWithThumbnails;
}

/**
 * カテゴリを変更
 */
function changeCategory(category) {
  yamlGeneratorState.activeCategory = category;
  yamlGeneratorState.selectedGroup = '';
  yamlGeneratorState.selectedSection = '';
  updateUI();
  updateGroupSectionFilter();
}

/**
 * カードを選択/解除
 */
function toggleCard(cardId) {
  if (yamlGeneratorState.selectedCards.has(cardId)) {
    yamlGeneratorState.selectedCards.delete(cardId);
  } else {
    yamlGeneratorState.selectedCards.add(cardId);
  }
  updateUI();
  // モードに応じてプレビューを更新
  if (yamlGeneratorState.mode === 'yaml') {
    updateYAMLPreview();
  } else if (yamlGeneratorState.mode === 'extract') {
    updateExtractPreview();
  }
}

/**
 * UIを更新（セットデータからカードを表示）
 * ストーリープロンプトと同じように直接DOM操作で描画
 */
function updateUI() {
  console.log('🔄 updateUI() 実行開始');
  console.log('  - activeCategory:', yamlGeneratorState.activeCategory);
  console.log('  - setsData:', Object.keys(yamlGeneratorState.setsData));
  
  // カテゴリタブを更新（直接DOM操作）
  const tabsContainer = document.getElementById('yamlCategoryTabs');
  if (!tabsContainer) {
    console.error('  ❌ yamlCategoryTabs要素が見つかりません');
    return;
  }
  
  const categories = [
    { key: 'characterface', label: '😊 顔', icon: '😊' },
    { key: 'clothing', label: '👗 服装', icon: '👗' },
    { key: 'poseemotion', label: '🤸 ポーズ', icon: '🤸' },
    { key: 'backgrounds', label: '🏞️ 背景', icon: '🏞️' },
    { key: 'characterbody', label: '💃 体', icon: '💃' },
    { key: 'expression', label: '😊 表情', icon: '😊' },
    { key: 'uncategorized', label: '📦 その他', icon: '📦' }
  ];
  
  tabsContainer.innerHTML = '';
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `yaml-category-tab ${yamlGeneratorState.activeCategory === cat.key ? 'active' : ''}`;
    btn.textContent = cat.label;
    btn.onclick = () => changeCategory(cat.key);
    tabsContainer.appendChild(btn);
  });
  
  console.log('  ✅ カテゴリタブ更新完了');
  
  // グループ/セッションフィルターを更新
  updateGroupSectionFilter();
  
  // カードを更新（セットデータから直接DOM操作）
  const cardsContainer = document.getElementById('yamlCardsArea');
  if (!cardsContainer) {
    console.error('  ❌ yamlCardsArea要素が見つかりません');
    return;
  }
  
  // カテゴリマッピング
  const categoryMapping = {
    characterface: 'face',
    characterbody: 'body',
    backgrounds: 'background',
    clothing: 'clothing',
    poseemotion: 'pose',
    expression: 'expression',
    uncategorized: null
  };
  
  const mappedCategory = categoryMapping[yamlGeneratorState.activeCategory];
  let categoryCards = [];
  
  if (mappedCategory === 'pose' && yamlGeneratorState.setsData.pose && yamlGeneratorState.setsData.pose.groups) {
    // ポーズは階層構造（groups → sections → sets）をフラット化
    // 注意: sectionData自体がセットのオブジェクト（{setName: {tags, image}, ...}）
    const poseGroups = yamlGeneratorState.setsData.pose.groups;
    console.log('  🔍 ポーズグループ:', Object.keys(poseGroups));
    Object.entries(poseGroups).forEach(([groupName, groupData]) => {
      // グループフィルター適用
      if (yamlGeneratorState.selectedGroup && yamlGeneratorState.selectedGroup !== groupName) {
        return;
      }
      
      if (groupData.sections) {
        Object.entries(groupData.sections).forEach(([sectionName, sectionData]) => {
          // セッションフィルター適用
          if (yamlGeneratorState.selectedSection && yamlGeneratorState.selectedSection !== sectionName) {
            return;
          }
          
          // sectionData自体がセットのオブジェクト（ストーリープロンプトと同じ構造）
          Object.entries(sectionData).forEach(([setName, setData]) => {
            // setDataがオブジェクトで、tagsやimageプロパティを持つ場合のみ追加
            if (setData && typeof setData === 'object' && (setData.tags || setData.image)) {
              categoryCards.push({
                id: `set_pose_${groupName}_${sectionName}_${setName}`,
                setName: setName,
                tags: setData.tags || [],
                thumbnail: setData.image || null,
                setData: setData,
                groupName: groupName,
                sectionName: sectionName
              });
            }
          });
        });
      }
    });
    console.log(`  📊 ポーズカテゴリ: ${categoryCards.length}セット`);
    if (categoryCards.length > 0) {
      console.log('  📦 ポーズカードサンプル:', categoryCards[0]);
    } else {
      console.warn('  ⚠️ ポーズカードが0件です。データ構造を確認してください。');
      console.log('  🔍 ポーズデータ構造:', JSON.stringify(yamlGeneratorState.setsData.pose, null, 2).substring(0, 500));
    }
  } else if (mappedCategory && yamlGeneratorState.setsData[mappedCategory] && yamlGeneratorState.setsData[mappedCategory].groups) {
    // 他のカテゴリも階層構造（groups → sections → sets）
    const categoryGroups = yamlGeneratorState.setsData[mappedCategory].groups;
    Object.entries(categoryGroups).forEach(([groupName, groupData]) => {
      // グループフィルター適用
      if (yamlGeneratorState.selectedGroup && yamlGeneratorState.selectedGroup !== groupName) {
        return;
      }
      
      if (groupData.sections) {
        Object.entries(groupData.sections).forEach(([sectionName, sectionData]) => {
          // セッションフィルター適用
          if (yamlGeneratorState.selectedSection && yamlGeneratorState.selectedSection !== sectionName) {
            return;
          }
          
          // sectionData自体がセットのオブジェクト（{setName: {tags, image}, ...}）
          Object.entries(sectionData).forEach(([setName, setData]) => {
            if (setData && typeof setData === 'object' && (setData.tags || setData.image)) {
              categoryCards.push({
                id: `set_${mappedCategory}_${setName}`,
                setName: setName,
                tags: setData.tags || [],
                thumbnail: setData.image || null,
                setData: setData,
                groupName: groupName,
                sectionName: sectionName
              });
            }
          });
        });
      }
    });
    
    console.log(`  📊 ${mappedCategory}カテゴリ: ${categoryCards.length}セット`);
  }
  
  // カードを直接DOM操作で描画（ストーリープロンプトと同じ方式）
  cardsContainer.innerHTML = '';
  
  if (categoryCards.length === 0) {
    cardsContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #999; padding: 60px; font-size: 18px; font-weight: bold;">カードがありません</div>';
    return;
  }
  
  categoryCards.forEach((card, index) => {
    const cardId = card.id || card.setName;
    const cardElement = document.createElement('div');
    cardElement.dataset.cardId = cardId;
    const isSelected = yamlGeneratorState.selectedCards.has(card.id) || yamlGeneratorState.selectedCards.has(card.setName) || yamlGeneratorState.selectedCards.has(cardId);
    
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
    if (isSelected) {
      const badge = document.createElement('div');
      const selectedArray = Array.from(yamlGeneratorState.selectedCards);
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
    
    // セット名表示
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
    }
    
    // サムネイル画像（ストーリープロンプトと同じ方式）
    const img = document.createElement('img');
    if (card.thumbnail) {
      // 画像パスを構築（2つの形式に対応）
      let imagePath;
      const baseDir = 'C:/Claude Code/tool/prompt-classifier-v3/data/sets/images';
      
      if (card.thumbnail.includes('/') || card.thumbnail.includes('\\')) {
        // 新形式: pose/default/日常グラビアポーズ/___________1762656355317.jpg
        // → data/sets/images/pose/default/日常グラビアポーズ/___________1762656355317.jpg
        imagePath = `${baseDir}/${card.thumbnail}`.replace(/\\/g, '/');
      } else {
        // 旧形式: img_xxx.jpg
        // → data/sets/images/thumbnails/img_xxx.jpg
        imagePath = `${baseDir}/thumbnails/${card.thumbnail}`;
      }
      
      const fullPath = `file:///${imagePath}`.replace(/\\/g, '/');
      console.log(`🖼️ [${card.setName}] 画像パス: ${fullPath}`);
      img.src = fullPath;
    } else {
      console.log(`⚠️ [${card.setName}] 画像なし`);
      img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="140"><rect width="160" height="140" fill="%23f5f7fa"/><text x="80" y="60" text-anchor="middle" fill="%23999" font-size="12" font-weight="bold">No Image</text><text x="80" y="80" text-anchor="middle" fill="%23bbb" font-size="10">' + encodeURIComponent(card.setName.substring(0, 20)) + '</text></svg>';
    }
    img.style.cssText = 'width: 100%; height: 140px; object-fit: cover; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);';
    img.onerror = () => {
      img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="140"><rect width="160" height="140" fill="%23ffe0e0"/><text x="80" y="60" text-anchor="middle" fill="%23d63031" font-size="12">画像なし</text></svg>';
    };
    cardElement.appendChild(img);
    
    // タグ表示
    const tagContainer = document.createElement('div');
    tagContainer.style.cssText = 'padding: 8px; font-size: 11px; color: #2d3436; line-height: 1.4; max-height: 60px; overflow: hidden;';
    const tagsText = card.tags.slice(0, 5).join(', ');
    tagContainer.textContent = tagsText + (card.tags.length > 5 ? '...' : '');
    cardElement.appendChild(tagContainer);
    
    // クリックイベント
    cardElement.addEventListener('click', () => {
      toggleCard(card.id || card.setName);
    });
    
    cardsContainer.appendChild(cardElement);
  });
  
  console.log(`  ✅ カード描画完了: ${categoryCards.length}枚`);
  
  // 統計を更新（直接DOM操作）
  const statsContainer = document.getElementById('yamlStatistics');
  if (statsContainer) {
    const stats = calculateStatistics();
    let statsHTML = '<div class="yaml-stats-grid">';
    
    // 基本統計
    statsHTML += `<div class="yaml-stat-item">
      <span class="yaml-stat-label">総行数:</span>
      <span class="yaml-stat-value">${stats.totalLines}</span>
    </div>`;
    statsHTML += `<div class="yaml-stat-item">
      <span class="yaml-stat-label">分類済み:</span>
      <span class="yaml-stat-value">${stats.classifiedLines}</span>
    </div>`;
    statsHTML += `<div class="yaml-stat-item">
      <span class="yaml-stat-label">選択中:</span>
      <span class="yaml-stat-value">${stats.selectedCards}</span>
    </div>`;
    
    // カテゴリ別カウント（選択数も表示）
    const categoryLabels = {
      characterface: '😊 顔',
      clothing: '👗 服装',
      poseemotion: '🤸 ポーズ',
      backgrounds: '🏞️ 背景',
      characterbody: '💃 体',
      expression: '😊 表情',
      uncategorized: '📦 その他'
    };
    
    const categoryKeys = ['characterface', 'clothing', 'poseemotion', 'backgrounds', 'characterbody', 'expression', 'uncategorized'];
    categoryKeys.forEach(category => {
      const total = stats[category] || 0;
      // 選択カウントのプロパティ名を取得
      const selectedKey = `selected${category.charAt(0).toUpperCase() + category.slice(1)}`;
      const selected = stats[selectedKey] || 0;
      const label = categoryLabels[category] || category;
      
      if (selected > 0) {
        statsHTML += `<div class="yaml-stat-item">
          <span class="yaml-stat-label">${label}:</span>
          <span class="yaml-stat-value">${total} <span style="color: #667eea; font-weight: bold;">(${selected}選択)</span></span>
        </div>`;
      } else {
        statsHTML += `<div class="yaml-stat-item">
          <span class="yaml-stat-label">${label}:</span>
          <span class="yaml-stat-value">${total}</span>
        </div>`;
      }
    });
    
    statsHTML += '</div>';
    statsContainer.innerHTML = statsHTML;
  }
}

/**
 * 統計情報を計算（セットデータから）
 */
function calculateStatistics() {
  // セットデータから統計を計算
  const stats = {
    totalLines: 0,
    classifiedLines: 0,
    selectedCards: yamlGeneratorState.selectedCards.size,
    characterface: 0,
    clothing: 0,
    poseemotion: 0,
    backgrounds: 0,
    characterbody: 0,
    expression: 0,
    uncategorized: 0,
    // 選択したカードのカテゴリ別カウント
    selectedCharacterface: 0,
    selectedClothing: 0,
    selectedPoseemotion: 0,
    selectedBackgrounds: 0,
    selectedCharacterbody: 0,
    selectedExpression: 0,
    selectedUncategorized: 0
  };
  
  // 全てのカテゴリで階層構造からセット数を計算
  const categories = ['face', 'body', 'background', 'clothing', 'expression', 'pose'];
  const categoryMapping = {
    face: 'characterface',
    body: 'characterbody',
    background: 'backgrounds',
    clothing: 'clothing',
    expression: 'expression',
    pose: 'poseemotion'
  };
  
  categories.forEach(category => {
    if (yamlGeneratorState.setsData[category] && yamlGeneratorState.setsData[category].groups) {
      const mappedCategory = categoryMapping[category];
      Object.values(yamlGeneratorState.setsData[category].groups).forEach(group => {
        if (group.sections) {
          Object.values(group.sections).forEach(section => {
            // section自体がセットのオブジェクト {setName: {tags, image}, ...}
            const count = Object.keys(section).filter(key => {
              const setData = section[key];
              return setData && typeof setData === 'object' && (setData.tags || setData.image);
            }).length;
            stats[mappedCategory] += count;
          });
        }
      });
    }
  });
  
  // 選択したカードのカテゴリ別カウント
  yamlGeneratorState.selectedCards.forEach(cardId => {
    const parts = cardId.split('_');
    if (parts[0] === 'set') {
      const category = parts[1];
      // カテゴリマッピング（カードIDのカテゴリ名 → 統計のカテゴリ名）
      const categoryMapping = {
        'pose': 'poseemotion',
        'face': 'characterface',
        'clothing': 'clothing',
        'background': 'backgrounds',
        'body': 'characterbody',
        'expression': 'expression'
      };
      
      const mappedCategory = categoryMapping[category] || 'uncategorized';
      const selectedKey = `selected${mappedCategory.charAt(0).toUpperCase() + mappedCategory.slice(1)}`;
      if (stats.hasOwnProperty(selectedKey)) {
        stats[selectedKey]++;
      } else {
        stats.selectedUncategorized++;
      }
    }
  });
  
  stats.totalLines = stats.characterface + stats.clothing + stats.poseemotion + 
                     stats.backgrounds + stats.characterbody + stats.expression + stats.uncategorized;
  stats.classifiedLines = stats.totalLines;
  
  return stats;
}

/**
 * YAMLプレビューを更新（セットデータから）
 */
function updateYAMLPreview() {
  // テキスト抽出モードでは何もしない
  if (yamlGeneratorState.mode === 'extract') {
    return;
  }
  
  const previewContainer = document.getElementById('yamlPreview');
  if (!previewContainer) return;
  
  // 選択されたカードからセットデータを取得
  const selectedSets = [];
  yamlGeneratorState.selectedCards.forEach(cardId => {
    // カードIDからセット情報を取得
    const parts = cardId.split('_');
    if (parts[0] === 'set') {
      const category = parts[1];
      
      // ポーズの場合は特別処理（階層構造: set_pose_group_section_setName）
      if (category === 'pose') {
        const groupName = parts[2];
        const sectionName = parts[3];
        const setName = parts.slice(4).join('_');
        
        if (yamlGeneratorState.setsData.pose && 
            yamlGeneratorState.setsData.pose.groups[groupName] &&
            yamlGeneratorState.setsData.pose.groups[groupName].sections &&
            yamlGeneratorState.setsData.pose.groups[groupName].sections[sectionName] &&
            yamlGeneratorState.setsData.pose.groups[groupName].sections[sectionName][setName]) {
          // sectionData自体がセットのオブジェクト（{setName: {tags, image}, ...}）
          const setData = yamlGeneratorState.setsData.pose.groups[groupName].sections[sectionName][setName];
          selectedSets.push({
            category: 'poseemotion',
            setName: setName,
            tags: setData.tags || []
          });
        }
      } else {
        // 他のカテゴリも階層構造（groups → sections → sets）
        const setName = parts.slice(2).join('_');
        
        if (yamlGeneratorState.setsData[category] && 
            yamlGeneratorState.setsData[category].groups) {
          // 全グループ・セクションから検索
          let found = false;
          Object.values(yamlGeneratorState.setsData[category].groups).forEach(groupData => {
            if (found) return;
            if (groupData.sections) {
              Object.values(groupData.sections).forEach(sectionData => {
                if (found) return;
                // sectionData自体がセットのオブジェクト
                if (sectionData[setName]) {
                  const setData = sectionData[setName];
                  const categoryMapping = {
                    face: 'characterface',
                    body: 'characterbody',
                    background: 'backgrounds',
                    clothing: 'clothing',
                    expression: 'expression'
                  };
                  selectedSets.push({
                    category: categoryMapping[category] || category,
                    setName: setName,
                    tags: setData.tags || []
                  });
                  found = true;
                }
              });
            }
          });
        }
      }
    }
  });
  
  if (selectedSets.length === 0) {
    previewContainer.value = 'カードを選択してください';
    return;
  }
  
  // セットデータからYAMLを生成
  const yamlSections = {
    character_main: [],
    characterface: [],
    clothing: [],
    poseemotion: [],
    backgrounds: [],
    characterbody: [],
    expression: [],
    uncategorized: []
  };
  
  // character_mainテンプレートを追加
  yamlSections.character_main.push(
    '1girl, solo, __characterface__, __characterbody__, __clothing__, __poseemotion__, __backgrounds__, __expression__, __uncategorized__'
  );
  
  // 選択されたセットのタグをカテゴリごとに追加
  selectedSets.forEach(set => {
    if (set.category && set.tags && set.tags.length > 0) {
      const tagsString = `"${set.tags.join(', ')}"`;
      yamlSections[set.category].push(tagsString);
    }
  });
  
  // YAML形式にフォーマット
  let yamlContent = '';
  const sectionOrder = ['character_main', 'characterface', 'clothing', 'poseemotion', 'backgrounds', 'characterbody', 'expression', 'uncategorized'];
  
  sectionOrder.forEach(section => {
    if (yamlSections[section].length > 0) {
      yamlContent += `${section}:\n`;
      yamlSections[section].forEach(item => {
        yamlContent += `  - ${item}\n`;
      });
      yamlContent += '\n';
    }
  });
  
  previewContainer.value = yamlContent || 'YAML生成エラー';
}

/**
 * YAMLを生成して保存
 */
async function generateAndSaveYAML() {
  try {
    if (yamlGeneratorState.selectedCards.size === 0) {
      alert('カードを選択してください');
      return;
    }
    
    // プレビューからYAMLを取得（既に生成済み）
    const previewContainer = document.getElementById('yamlPreview');
    if (!previewContainer || !previewContainer.value) {
      alert('YAMLが生成されていません。プレビューを確認してください。');
      return;
    }
    
    const yamlContent = previewContainer.value;
    
    // 保存ダイアログを表示
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const defaultPath = `prompts_classified_${dateStr}.yaml`;
    
    const filePath = await window.FileHandler.showSaveDialog(defaultPath, [
      { name: 'YAML Files', extensions: ['yaml'] },
      { name: 'All Files', extensions: ['*'] }
    ]);
    
    if (!filePath) {
      return; // キャンセル
    }
    
    // ファイルを保存
    await window.FileHandler.saveYamlFile(filePath, yamlContent);
    
    alert(`✅ YAMLファイルを保存しました\n${filePath}`);
  } catch (error) {
    console.error('❌ YAML生成エラー:', error);
    alert(`❌ エラー: ${error.message}`);
  }
}

/**
 * YAMLをクリップボードにコピー
 */
async function copyYAMLToClipboard() {
  const previewContainer = document.getElementById('yamlPreview');
  if (!previewContainer || !previewContainer.value) {
    alert('コピーするYAMLがありません');
    return;
  }
  
  try {
    await navigator.clipboard.writeText(previewContainer.value);
    alert('✅ YAMLをクリップボードにコピーしました');
  } catch (error) {
    console.error('❌ コピーエラー:', error);
    alert('❌ コピーに失敗しました');
  }
}

/**
 * モードを切り替え
 */
function switchMode(mode) {
  console.log('🔄 モード切り替え:', mode);
  yamlGeneratorState.mode = mode;
  
  // UI更新（モードに応じて表示を変更）
  const yamlModePanel = document.getElementById('yamlModePanel');
  const extractModePanel = document.getElementById('extractModePanel');
  const yamlOutputButtons = document.getElementById('yamlOutputButtons');
  const extractOutputButtons = document.getElementById('extractOutputButtons');
  const yamlPreviewSection = document.getElementById('yamlPreviewSection');
  const extractPreviewSection = document.getElementById('extractPreviewSection');
  const yamlModeBtn = document.getElementById('yamlModeBtn');
  const extractModeBtn = document.getElementById('extractModeBtn');
  const cardsArea = document.getElementById('yamlCardsArea');
  const groupSectionFilter = document.getElementById('yamlGroupSectionFilter');
  
  if (mode === 'yaml') {
    // YAML生成モード
    if (yamlModePanel) {
      yamlModePanel.style.display = 'block';
      // 設定部分を再表示
      const settingsHeader = yamlModePanel.querySelector('h3');
      const fileButton = yamlModePanel.querySelector('.yaml-action-btn');
      const statsSection = yamlModePanel.querySelector('.yaml-stats-section');
      if (settingsHeader) settingsHeader.style.display = 'block';
      if (fileButton) fileButton.style.display = 'block';
      if (statsSection) statsSection.style.display = 'block';
    }
    if (extractModePanel) extractModePanel.style.display = 'none';
    if (yamlOutputButtons) yamlOutputButtons.style.display = 'flex';
    if (extractOutputButtons) extractOutputButtons.style.display = 'none';
    if (yamlPreviewSection) yamlPreviewSection.style.display = 'block';
    if (extractPreviewSection) extractPreviewSection.style.display = 'none';
    if (yamlModeBtn) yamlModeBtn.classList.add('active');
    if (extractModeBtn) extractModeBtn.classList.remove('active');
    if (groupSectionFilter) groupSectionFilter.style.display = 'block';
    
    // カード表示エリアを更新（セット選択用）
    updateUI();
  } else {
    // テキスト抽出モード（YAML生成と同じUI、カード選択可能）
    // yamlModePanelは表示し続ける（カテゴリタブが必要なため）
    // ただし、設定部分（ファイル選択ボタンなど）は非表示にする
    const yamlModePanelSettings = yamlModePanel ? yamlModePanel.querySelector('.yaml-stats-section') : null;
    if (yamlModePanelSettings && yamlModePanelSettings.previousElementSibling) {
      // 「設定」セクションとファイル選択ボタンを非表示
      const settingsHeader = yamlModePanelSettings.previousElementSibling;
      if (settingsHeader.tagName === 'H3' || settingsHeader.classList.contains('yaml-action-btn')) {
        settingsHeader.style.display = 'none';
      }
      if (yamlModePanelSettings.previousElementSibling.tagName === 'BUTTON') {
        yamlModePanelSettings.previousElementSibling.style.display = 'none';
      }
    }
    if (yamlModePanelSettings) {
      yamlModePanelSettings.style.display = 'none';
    }
    
    if (extractModePanel) extractModePanel.style.display = 'none';
    if (yamlOutputButtons) yamlOutputButtons.style.display = 'none';
    if (extractOutputButtons) extractOutputButtons.style.display = 'flex';
    if (yamlPreviewSection) yamlPreviewSection.style.display = 'none';
    if (extractPreviewSection) extractPreviewSection.style.display = 'flex';
    if (yamlModeBtn) yamlModeBtn.classList.remove('active');
    if (extractModeBtn) extractModeBtn.classList.add('active');
    if (groupSectionFilter) groupSectionFilter.style.display = 'block'; // フィルターも表示
    
    // YAML生成と同じようにカードを表示
    updateUI();
    updateExtractPreview(); // テキスト抽出プレビューを更新
  }
}

/**
 * 全選択
 */
function selectAllCards() {
  // 現在表示中のカテゴリの全カードを選択
  const categoryMapping = {
    characterface: 'face',
    characterbody: 'body',
    backgrounds: 'background',
    clothing: 'clothing',
    poseemotion: 'pose',
    expression: 'expression',
    uncategorized: null
  };
  
  const mappedCategory = categoryMapping[yamlGeneratorState.activeCategory];
  let allCardIds = [];
  
  if (mappedCategory && yamlGeneratorState.setsData[mappedCategory] && yamlGeneratorState.setsData[mappedCategory].groups) {
    // 全てのカテゴリで階層構造（groups → sections → sets）
    Object.entries(yamlGeneratorState.setsData[mappedCategory].groups).forEach(([groupName, groupData]) => {
      // グループフィルター適用
      if (yamlGeneratorState.selectedGroup && yamlGeneratorState.selectedGroup !== groupName) {
        return;
      }
      
      if (groupData.sections) {
        Object.entries(groupData.sections).forEach(([sectionName, sectionData]) => {
          // セッションフィルター適用
          if (yamlGeneratorState.selectedSection && yamlGeneratorState.selectedSection !== sectionName) {
            return;
          }
          
          Object.keys(sectionData).forEach(setName => {
            const setData = sectionData[setName];
            if (setData && typeof setData === 'object' && (setData.tags || setData.image)) {
              if (mappedCategory === 'pose') {
                // ポーズは特別なID形式
                allCardIds.push(`set_pose_${groupName}_${sectionName}_${setName}`);
              } else {
                // 他のカテゴリは通常のID形式
                allCardIds.push(`set_${mappedCategory}_${setName}`);
              }
            }
          });
        });
      }
    });
  }
  
  // 全カードを選択
  allCardIds.forEach(cardId => {
    yamlGeneratorState.selectedCards.add(cardId);
  });
  
  updateUI();
  // モードに応じてプレビューを更新
  if (yamlGeneratorState.mode === 'yaml') {
    updateYAMLPreview();
  } else if (yamlGeneratorState.mode === 'extract') {
    updateExtractPreview();
  }
}

/**
 * 全解除
 */
function deselectAllCards() {
  yamlGeneratorState.selectedCards.clear();
  updateUI();
  // モードに応じてプレビューを更新
  if (yamlGeneratorState.mode === 'yaml') {
    updateYAMLPreview();
  } else if (yamlGeneratorState.mode === 'extract') {
    updateExtractPreview();
  }
}

/**
 * グループ/セッションフィルターを更新
 */
function updateGroupSectionFilter() {
  console.log('🔍 updateGroupSectionFilter() 実行');
  const filterContainer = document.getElementById('yamlGroupSectionFilter');
  const groupSelect = document.getElementById('yamlGroupSelect');
  const sectionSelect = document.getElementById('yamlSectionSelect');
  
  console.log('  - filterContainer:', !!filterContainer);
  console.log('  - groupSelect:', !!groupSelect);
  console.log('  - sectionSelect:', !!sectionSelect);
  console.log('  - activeCategory:', yamlGeneratorState.activeCategory);
  console.log('  - setsData.pose:', !!yamlGeneratorState.setsData.pose);
  
  if (!filterContainer || !groupSelect || !sectionSelect) {
    console.error('  ❌ フィルター要素が見つかりません');
    return;
  }
  
  const categoryMapping = {
    characterface: 'face',
    characterbody: 'body',
    backgrounds: 'background',
    clothing: 'clothing',
    poseemotion: 'pose',
    expression: 'expression',
    uncategorized: null
  };
  
  const mappedCategory = categoryMapping[yamlGeneratorState.activeCategory];
  console.log('  - mappedCategory:', mappedCategory);
  
  // 全てのカテゴリでフィルターを表示（階層構造がある場合）
  if (mappedCategory && yamlGeneratorState.setsData[mappedCategory] && yamlGeneratorState.setsData[mappedCategory].groups) {
    const groups = Object.keys(yamlGeneratorState.setsData[mappedCategory].groups);
    console.log(`  ✅ ${mappedCategory}カテゴリ: グループ数`, groups.length);
    filterContainer.style.display = 'block';
    
    // グループ選択を更新
    groupSelect.innerHTML = '<option value="">全てのグループ</option>';
    groups.forEach(groupName => {
      const option = document.createElement('option');
      option.value = groupName;
      option.textContent = groupName;
      if (yamlGeneratorState.selectedGroup === groupName) {
        option.selected = true;
      }
      groupSelect.appendChild(option);
    });
    
    // セッション選択を更新
    updateSectionSelect();
    console.log('  ✅ フィルターを表示');
  } else {
    console.log('  ⚠️ 階層構造がないため、フィルターを非表示');
    filterContainer.style.display = 'none';
    yamlGeneratorState.selectedGroup = '';
    yamlGeneratorState.selectedSection = '';
  }
}

/**
 * セッション選択を更新（グループ選択に基づく）
 */
function updateSectionSelect() {
  const sectionSelect = document.getElementById('yamlSectionSelect');
  if (!sectionSelect) return;
  
  sectionSelect.innerHTML = '<option value="">全てのセッション</option>';
  
  const categoryMapping = {
    characterface: 'face',
    characterbody: 'body',
    backgrounds: 'background',
    clothing: 'clothing',
    poseemotion: 'pose',
    expression: 'expression',
    uncategorized: null
  };
  
  const mappedCategory = categoryMapping[yamlGeneratorState.activeCategory];
  
  if (!yamlGeneratorState.selectedGroup || !mappedCategory || !yamlGeneratorState.setsData[mappedCategory] || !yamlGeneratorState.setsData[mappedCategory].groups) {
    return;
  }
  
  const groupData = yamlGeneratorState.setsData[mappedCategory].groups[yamlGeneratorState.selectedGroup];
  if (groupData && groupData.sections) {
    Object.keys(groupData.sections).forEach(sectionName => {
      const option = document.createElement('option');
      option.value = sectionName;
      option.textContent = sectionName;
      if (yamlGeneratorState.selectedSection === sectionName) {
        option.selected = true;
      }
      sectionSelect.appendChild(option);
    });
  }
}

/**
 * グループ変更時の処理
 */
function onGroupChange() {
  const groupSelect = document.getElementById('yamlGroupSelect');
  if (!groupSelect) return;
  
  yamlGeneratorState.selectedGroup = groupSelect.value;
  yamlGeneratorState.selectedSection = ''; // グループ変更時はセッションをリセット
  updateSectionSelect();
  updateUI();
}

/**
 * セッション変更時の処理
 */
function onSectionChange() {
  const sectionSelect = document.getElementById('yamlSectionSelect');
  if (!sectionSelect) return;
  
  yamlGeneratorState.selectedSection = sectionSelect.value;
  updateUI();
}

// グローバルに公開
window.YAMLGeneratorSystem = {
  initialize: initializeYAMLGenerator,
  selectAndClassifyFile,
  changeCategory,
  toggleCard,
  generateAndSaveYAML,
  copyYAMLToClipboard,
  switchMode,
  updateUI,
  selectAllCards,
  deselectAllCards,
  onGroupChange,
  onSectionChange,
  state: yamlGeneratorState
};

// グローバル関数（index.htmlから呼び出し可能）
function switchYAMLMode(mode) {
  window.YAMLGeneratorSystem.switchMode(mode);
}

/**
 * お気に入りに保存
 */
async function saveYAMLToFavorites() {
  // YAML生成モードの場合
  if (yamlGeneratorState.mode === 'yaml') {
    if (yamlGeneratorState.selectedCards.size === 0) {
      alert('保存するカードがありません');
      return;
    }
    
    // カスタム入力モーダルを作成
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 30000; display: flex; align-items: center; justify-content: center;';
    modal.innerHTML = `
      <div style="background: white; padding: 30px; border-radius: 12px; max-width: 500px; width: 90%;">
        <h3 style="margin: 0 0 20px 0; color: #2d3436;">⭐ お気に入りに保存</h3>
        <input type="text" id="yamlFavoriteNameInput" placeholder="お気に入り名を入力..." style="width: 100%; padding: 12px; font-size: 16px; border: 2px solid #dfe6e9; border-radius: 8px; margin-bottom: 20px;">
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button onclick="document.getElementById('saveYAMLModal').remove()" style="padding: 10px 20px; background: #b2bec3; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">キャンセル</button>
          <button onclick="confirmSaveYAMLFavorite()" style="padding: 10px 20px; background: #0984e3; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">保存</button>
        </div>
      </div>
    `;
    modal.id = 'saveYAMLModal';
    document.body.appendChild(modal);
    
    // 入力欄にフォーカス
    setTimeout(() => document.getElementById('yamlFavoriteNameInput').focus(), 100);
    
    // Enterキーで保存
    document.getElementById('yamlFavoriteNameInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') confirmSaveYAMLFavorite();
    });
  } else {
    // テキスト抽出モードの場合（YAML生成と同じようにselectedCardsを使用）
    if (yamlGeneratorState.selectedCards.size === 0) {
      alert('保存するカードがありません');
      return;
    }
    
    // カスタム入力モーダルを作成
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 30000; display: flex; align-items: center; justify-content: center;';
    modal.innerHTML = `
      <div style="background: white; padding: 30px; border-radius: 12px; max-width: 500px; width: 90%;">
        <h3 style="margin: 0 0 20px 0; color: #2d3436;">⭐ お気に入りに保存</h3>
        <input type="text" id="yamlFavoriteNameInput" placeholder="お気に入り名を入力..." style="width: 100%; padding: 12px; font-size: 16px; border: 2px solid #dfe6e9; border-radius: 8px; margin-bottom: 20px;">
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button onclick="document.getElementById('saveYAMLModal').remove()" style="padding: 10px 20px; background: #b2bec3; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">キャンセル</button>
          <button onclick="confirmSaveYAMLFavorite()" style="padding: 10px 20px; background: #0984e3; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">保存</button>
        </div>
      </div>
    `;
    modal.id = 'saveYAMLModal';
    document.body.appendChild(modal);
    
    // 入力欄にフォーカス
    setTimeout(() => document.getElementById('yamlFavoriteNameInput').focus(), 100);
    
    // Enterキーで保存
    document.getElementById('yamlFavoriteNameInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') confirmSaveYAMLFavorite();
    });
  }
}

/**
 * お気に入り保存を確定
 */
async function confirmSaveYAMLFavorite() {
  const favoriteName = document.getElementById('yamlFavoriteNameInput').value.trim();
  if (!favoriteName) {
    alert('お気に入り名を入力してください');
    return;
  }
  
  document.getElementById('saveYAMLModal').remove();
  
  let favoriteData;
  
  if (yamlGeneratorState.mode === 'yaml') {
    // YAML生成モード（セット選択モード）
    favoriteData = {
      name: favoriteName,
      timestamp: new Date().toISOString(),
      mode: 'yaml',
      selectedCards: Array.from(yamlGeneratorState.selectedCards)
    };
  } else {
    // テキスト抽出モード
    favoriteData = {
      name: favoriteName,
      timestamp: new Date().toISOString(),
      mode: 'extract',
      folderPath: yamlGeneratorState.folderPath,
      selectedCategories: Array.from(yamlGeneratorState.selectedCategories)
    };
  }
  
  try {
    const result = await window.electronAPI.loadYamlFavorites();
    const favorites = result.success ? result.favorites : [];
    favorites.push(favoriteData);
    
    const saveResult = await window.electronAPI.saveYamlFavorites(favorites);
    
    if (saveResult.success) {
      alert(`✅ 「${favoriteName}」をお気に入りに保存しました\n\n保存先: yaml_favorites.json`);
    } else {
      alert(`❌ 保存に失敗しました: ${saveResult.error}`);
    }
  } catch (error) {
    console.error('お気に入り保存エラー:', error);
    alert(`❌ 保存に失敗しました: ${error.message}`);
  }
}

/**
 * お気に入りから読み込み
 */
async function loadYAMLFromFavorites() {
  try {
    const result = await window.electronAPI.loadYamlFavorites();
    const favorites = result.success ? result.favorites : [];
    
    if (favorites.length === 0) {
      alert('お気に入りがありません');
      return;
    }
    
    // お気に入り一覧モーダルを作成
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 30000; display: flex; align-items: center; justify-content: center; overflow-y: auto;';
    modal.innerHTML = `
      <div style="background: white; padding: 30px; border-radius: 12px; max-width: 800px; width: 90%; max-height: 90vh; overflow-y: auto;">
        <h3 style="margin: 0 0 20px 0; color: #2d3436;">📁 お気に入り一覧</h3>
        <div id="yamlFavoritesList" style="margin-bottom: 20px;">
          ${favorites.map((fav, index) => `
            <div style="padding: 15px; margin-bottom: 10px; background: #f8f9fa; border-radius: 8px; border: 2px solid #dee2e6;">
              <div style="font-weight: bold; color: #2d3436; margin-bottom: 5px;">${fav.name}</div>
              <div style="font-size: 12px; color: #666; margin-bottom: 10px;">
                ${new Date(fav.timestamp).toLocaleString('ja-JP')} | 
                ${fav.mode === 'yaml' ? `📄 YAML生成 | ${fav.selectedCards ? fav.selectedCards.length : 0}カード` : `📋 テキスト抽出 | ${fav.selectedCategories ? fav.selectedCategories.length : 0}カテゴリ`}
              </div>
              <div style="display: flex; gap: 10px;">
                <button onclick="applyFavoriteYAML(${index}); document.getElementById('yamlFavoritesModal').remove();" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">読み込み</button>
                <button onclick="deleteFavoriteYAML(${index})" style="padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">削除</button>
              </div>
            </div>
          `).join('')}
        </div>
        <div style="display: flex; justify-content: flex-end;">
          <button onclick="document.getElementById('yamlFavoritesModal').remove()" style="padding: 10px 20px; background: #b2bec3; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">閉じる</button>
        </div>
      </div>
    `;
    modal.id = 'yamlFavoritesModal';
    document.body.appendChild(modal);
  } catch (error) {
    console.error('お気に入り読み込みエラー:', error);
    alert(`❌ 読み込みに失敗しました: ${error.message}`);
  }
}

/**
 * お気に入りを適用
 */
async function applyFavoriteYAML(index) {
  try {
    const result = await window.electronAPI.loadYamlFavorites();
    const favorites = result.success ? result.favorites : [];
    
    if (index < 0 || index >= favorites.length) {
      alert('お気に入りが見つかりません');
      return;
    }
    
    const favorite = favorites[index];
    
    // モードを切り替え
    if (favorite.mode) {
      switchYAMLMode(favorite.mode);
    }
    
    if (favorite.mode === 'yaml') {
      // YAML生成モード
      if (favorite.filePath) {
        yamlGeneratorState.filePath = favorite.filePath;
        
        // ファイルを読み込んで分類
        try {
          const content = await window.FileHandler.readTextFile(favorite.filePath);
          await classifyFile(content);
          
          // 選択されたカードを復元
          if (favorite.selectedCards && favorite.selectedCards.length > 0) {
            yamlGeneratorState.selectedCards.clear();
            favorite.selectedCards.forEach(card => {
              const cardId = `card_${card.lineNumber}`;
              const line = yamlGeneratorState.classifiedLines.find(l => l.id === cardId);
              if (line) {
                yamlGeneratorState.selectedCards.add(cardId);
              }
            });
          }
          
          updateUI();
          updateYAMLPreview();
          
          alert(`✅ 「${favorite.name}」を読み込みました`);
        } catch (error) {
          console.error('ファイル読み込みエラー:', error);
          alert(`❌ ファイル読み込みに失敗しました: ${error.message}`);
        }
      }
    } else {
      // テキスト抽出モード
      if (favorite.folderPath) {
        yamlGeneratorState.folderPath = favorite.folderPath;
        
        // 選択されたカテゴリを復元
        if (favorite.selectedCategories && favorite.selectedCategories.length > 0) {
          yamlGeneratorState.selectedCategories.clear();
          favorite.selectedCategories.forEach(cat => {
            yamlGeneratorState.selectedCategories.add(cat);
          });
          
          // チェックボックスを更新
          favorite.selectedCategories.forEach(cat => {
            const checkbox = document.querySelector(`input[value="${cat}"]`);
            if (checkbox) {
              checkbox.checked = true;
            }
          });
        }
        
        alert(`✅ 「${favorite.name}」を読み込みました`);
      }
    }
  } catch (error) {
    console.error('お気に入り適用エラー:', error);
    alert(`❌ 適用に失敗しました: ${error.message}`);
  }
}

/**
 * お気に入りを削除
 */
async function deleteFavoriteYAML(index) {
  try {
    const result = await window.electronAPI.loadYamlFavorites();
    const favorites = result.success ? result.favorites : [];
    
    if (index < 0 || index >= favorites.length) {
      alert('お気に入りが見つかりません');
      return;
    }
    
    const favoriteName = favorites[index].name;
    favorites.splice(index, 1);
    
    const saveResult = await window.electronAPI.saveYamlFavorites(favorites);
    
    if (saveResult.success) {
      alert(`✅ 「${favoriteName}」を削除しました`);
      // モーダルを再表示
      loadYAMLFromFavorites();
    } else {
      alert(`❌ 削除に失敗しました: ${saveResult.error}`);
    }
  } catch (error) {
    console.error('削除エラー:', error);
    alert(`❌ 削除に失敗しました: ${error.message}`);
  }
}

/**
 * テキスト抽出プレビューを更新（選択したカードのタグを並べるだけ）
 */
function updateExtractPreview() {
  // YAML生成モードでは何もしない
  if (yamlGeneratorState.mode === 'yaml') {
    return;
  }
  
  const previewContainer = document.getElementById('extractPreview');
  if (!previewContainer) return;
  
  // 選択されたカードからタグを取得
  const allTags = [];
  yamlGeneratorState.selectedCards.forEach(cardId => {
    const parts = cardId.split('_');
    if (parts[0] === 'set') {
      const category = parts[1];
      
      // ポーズの場合は特別処理（階層構造: set_pose_group_section_setName）
      if (category === 'pose') {
        const groupName = parts[2];
        const sectionName = parts[3];
        const setName = parts.slice(4).join('_');
        
        if (yamlGeneratorState.setsData.pose && 
            yamlGeneratorState.setsData.pose.groups[groupName] &&
            yamlGeneratorState.setsData.pose.groups[groupName].sections &&
            yamlGeneratorState.setsData.pose.groups[groupName].sections[sectionName] &&
            yamlGeneratorState.setsData.pose.groups[groupName].sections[sectionName][setName]) {
          const setData = yamlGeneratorState.setsData.pose.groups[groupName].sections[sectionName][setName];
          if (setData.tags && Array.isArray(setData.tags)) {
            allTags.push(...setData.tags);
          }
        }
      } else {
        // 他のカテゴリも階層構造（groups → sections → sets）
        const setName = parts.slice(2).join('_');
        
        if (yamlGeneratorState.setsData[category] && 
            yamlGeneratorState.setsData[category].groups) {
          // 全グループ・セクションから検索
          let found = false;
          Object.values(yamlGeneratorState.setsData[category].groups).forEach(groupData => {
            if (found) return;
            if (groupData.sections) {
              Object.values(groupData.sections).forEach(sectionData => {
                if (found) return;
                // sectionData自体がセットのオブジェクト
                if (sectionData[setName]) {
                  const setData = sectionData[setName];
                  if (setData.tags && Array.isArray(setData.tags)) {
                    allTags.push(...setData.tags);
                  }
                  found = true;
                }
              });
            }
          });
        }
      }
    }
  });
  
  // タグをカンマ区切りで並べる
  const extractedText = allTags.join(', ');
  
  previewContainer.value = extractedText || 'カードを選択してください';
}

/**
 * テキスト抽出を実行して表示（簡素化：選択したカードのタグを並べるだけ）
 */
function extractAndShowText() {
  console.log('📋 テキスト抽出実行');
  console.log('  - selectedCards:', yamlGeneratorState.selectedCards.size);
  
  if (yamlGeneratorState.selectedCards.size === 0) {
    alert('カードを選択してください');
    return;
  }
  
  // プレビューを更新（選択したカードのタグを並べる）
  updateExtractPreview();
  
  const previewContainer = document.getElementById('extractPreview');
  if (previewContainer && previewContainer.value && previewContainer.value !== 'カードを選択してください') {
    console.log('✅ テキスト抽出完了:', previewContainer.value.length, '文字');
    // プレビューセクションを確実に表示
    const extractPreviewSection = document.getElementById('extractPreviewSection');
    if (extractPreviewSection) {
      extractPreviewSection.style.display = 'flex';
    }
  } else {
    alert('抽出するタグがありません');
  }
}

/**
 * 抽出結果をクリップボードにコピー
 */
async function copyExtractedText() {
  const previewContainer = document.getElementById('extractPreview');
  if (!previewContainer || !previewContainer.value) {
    alert('コピーするテキストがありません');
    return;
  }
  
  try {
    await navigator.clipboard.writeText(previewContainer.value);
    alert('✅ テキストをクリップボードにコピーしました');
  } catch (error) {
    console.error('❌ コピーエラー:', error);
    alert('❌ コピーに失敗しました');
  }
}

/**
 * 抽出結果をファイルに保存
 */
async function saveExtractedText() {
  try {
    if (!yamlGeneratorState.extractionResults || yamlGeneratorState.extractionResults.length === 0) {
      alert('保存する抽出結果がありません');
      return;
    }
    
    const extractedText = window.TextExtractor.formatExtractionResults(yamlGeneratorState.extractionResults);
    const selectedCategories = Array.from(yamlGeneratorState.selectedCategories);
    const fileName = window.TextExtractor.generateExtractionFileName(selectedCategories);
    
    const filePath = await window.FileHandler.showSaveDialog(fileName, [
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]);
    
    if (!filePath) {
      return; // キャンセル
    }
    
    await window.FileHandler.saveTextFile(filePath, extractedText);
    
    alert(`✅ テキストファイルを保存しました\n${filePath}`);
  } catch (error) {
    console.error('❌ ファイル保存エラー:', error);
    alert(`❌ エラー: ${error.message}`);
  }
}

