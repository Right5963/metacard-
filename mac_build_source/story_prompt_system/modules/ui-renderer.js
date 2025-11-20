// ui-renderer.js - UI描画モジュール
// 責任: DOM操作、UI更新

const UIRenderer = (() => {
    'use strict';

    const refs = {};

    /**
     * DOM参照を初期化
     */
    const initRefs = () => {
        // ビュー
        refs.poseSelectionView = document.getElementById('poseSelectionView');
        refs.sceneEditView = document.getElementById('sceneEditView');
        
        // グループ・セクション
        refs.groupTabs = document.getElementById('groupTabs');
        refs.sectionsContainer = document.getElementById('sectionsContainer');
        
        // カードグリッド
        refs.poseCardGrid = document.getElementById('poseCardGrid');
        refs.sceneCardsStrip = document.getElementById('sceneCardsStrip');
        
        // シーン詳細
        refs.sceneDetailTitle = document.getElementById('sceneDetailTitle');
        refs.clothingStateBtns = document.querySelectorAll('.state-btn');
        
        // 統計・プレビュー
        refs.sceneCount = document.getElementById('sceneCount');
        refs.sceneTypeDisplay = document.getElementById('sceneTypeDisplay');
        refs.previewText = document.getElementById('previewText');
        refs.sceneListCard = document.getElementById('sceneListCard');
        refs.sceneList = document.getElementById('sceneList');
        
        // ライブラリ
        refs.storyListUl = document.getElementById('storyListUl');
        refs.storyListEmpty = document.getElementById('storyListEmpty');
        
        // ステータス
        refs.statusMessage = document.getElementById('statusMessage');
        
        console.log('[UIRenderer] DOM参照初期化完了');
    };

    /**
     * ポーズカードを描画
     * @param {Array} poses - ポーズ配列
     * @param {Array} selectedPoses - 選択中のポーズ配列
     * @param {Function} onCardClick - カードクリック時のコールバック
     */
    const renderPoseCards = (poses, selectedPoses, onCardClick) => {
        if (!refs.poseCardGrid) return;
        
        refs.poseCardGrid.innerHTML = '';
        
        if (poses.length === 0) {
            refs.poseCardGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">ポーズセットがありません</p>';
            return;
        }
        
        poses.forEach((set, index) => {
            const card = document.createElement('div');
            card.className = 'pose-card';
            card.dataset.setId = set.id || `pose-${index}`;
            
            const isSelected = selectedPoses.some(p => p.id === (set.id || set.name));
            if (isSelected) {
                card.classList.add('selected');
            }
            
            const imageDiv = document.createElement('div');
            imageDiv.className = 'pose-card-image';
            imageDiv.textContent = '🤸';
            
            const titleDiv = document.createElement('div');
            titleDiv.className = 'pose-card-title';
            titleDiv.textContent = set.name || `ポーズ${index + 1}`;
            
            card.appendChild(imageDiv);
            card.appendChild(titleDiv);
            
            if (isSelected) {
                const badge = document.createElement('div');
                badge.className = 'pose-card-badge';
                const order = selectedPoses.findIndex(p => p.id === (set.id || set.name)) + 1;
                badge.textContent = order;
                card.appendChild(badge);
            }
            
            card.addEventListener('click', () => onCardClick(set));
            
            refs.poseCardGrid.appendChild(card);
        });
        
        console.log('[UIRenderer] ポーズカード描画完了:', poses.length);
    };

    /**
     * シーンカードを描画
     * @param {Array} scenes - シーン配列
     * @param {string} activeSceneId - アクティブシーンID
     * @param {Function} onCardClick - カードクリック時のコールバック
     */
    const renderSceneCards = (scenes, activeSceneId, onCardClick) => {
        if (!refs.sceneCardsStrip) return;
        
        refs.sceneCardsStrip.innerHTML = '';
        
        scenes.forEach((scene, index) => {
            const card = document.createElement('div');
            card.className = 'scene-card';
            if (scene.id === activeSceneId) {
                card.classList.add('active');
            }
            
            const number = document.createElement('div');
            number.className = 'scene-card-number';
            number.textContent = index + 1;
            
            const title = document.createElement('div');
            title.className = 'scene-card-title';
            title.textContent = scene.title;
            
            card.appendChild(number);
            card.appendChild(title);
            
            card.addEventListener('click', () => onCardClick(scene.id));
            
            refs.sceneCardsStrip.appendChild(card);
        });
        
        console.log('[UIRenderer] シーンカード描画完了:', scenes.length);
    };

    /**
     * シーン詳細を描画
     * @param {Object} scene - シーンオブジェクト
     */
    const renderSceneDetail = (scene) => {
        if (!scene || !refs.sceneDetailTitle) return;
        
        refs.sceneDetailTitle.textContent = `💎 ${scene.title}`;
        
        // 服装状態ボタンの更新
        refs.clothingStateBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.state === scene.clothingState);
        });
        
        console.log('[UIRenderer] シーン詳細描画完了:', scene.id);
    };

    /**
     * 統計を更新
     * @param {Object} stats - 統計データ
     */
    const updateStats = (stats) => {
        const { sceneCount, sceneType } = stats;
        
        if (refs.sceneCount) {
            refs.sceneCount.textContent = `${sceneCount}個`;
        }
        
        if (refs.sceneTypeDisplay) {
            const SCENE_TYPES = {
                normal: '普通のSEX',
                lesbian: 'レズビアン'
            };
            refs.sceneTypeDisplay.textContent = SCENE_TYPES[sceneType] || '-';
        }
        
        // シーン一覧の表示/非表示
        if (refs.sceneListCard) {
            refs.sceneListCard.style.display = sceneCount > 0 ? 'block' : 'none';
        }
        
        console.log('[UIRenderer] 統計更新完了');
    };

    /**
     * プレビューを更新
     * @param {string} text - プレビューテキスト
     */
    const updatePreview = (text) => {
        if (refs.previewText) {
            refs.previewText.value = text;
            console.log('[UIRenderer] プレビュー更新完了');
        }
    };

    /**
     * ストーリー一覧を描画
     * @param {Array} stories - ストーリー配列
     * @param {Function} onStoryClick - ストーリークリック時のコールバック
     */
    const renderStoryList = (stories, onStoryClick) => {
        if (!refs.storyListUl) return;
        
        refs.storyListUl.innerHTML = '';
        
        if (stories.length === 0) {
            refs.storyListEmpty.style.display = 'block';
            return;
        }
        
        refs.storyListEmpty.style.display = 'none';
        
        stories.forEach(story => {
            const li = document.createElement('li');
            li.className = 'story-list-item';
            
            const title = document.createElement('div');
            title.className = 'story-list-item-title';
            title.textContent = story.title || '無題';
            
            const meta = document.createElement('div');
            meta.className = 'story-list-item-meta';
            const sceneCount = story.scenes ? story.scenes.length : (story.sceneCount || 0);
            const date = new Date(story.createdAt).toLocaleDateString();
            meta.textContent = `シーン: ${sceneCount}個 | ${date}`;
            
            li.appendChild(title);
            li.appendChild(meta);
            
            li.addEventListener('click', () => onStoryClick(story.id));
            
            refs.storyListUl.appendChild(li);
        });
        
        console.log('[UIRenderer] ストーリー一覧描画完了:', stories.length);
    };

    /**
     * ステータスメッセージを設定
     * @param {string} message - メッセージ
     * @param {string} type - タイプ ('success', 'error', 'info')
     */
    const setStatus = (message, type = 'info') => {
        if (!refs.statusMessage) return;
        
        refs.statusMessage.textContent = message;
        
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            info: '#0369a1'
        };
        
        refs.statusMessage.style.borderColor = colors[type] || colors.info;
        refs.statusMessage.style.color = colors[type] || colors.info;
        
        console.log(`[UIRenderer] ステータス: ${message} (${type})`);
    };

    /**
     * ビューを切り替え
     * @param {string} view - ビュー名 ('pose' or 'scene')
     */
    const switchView = (view) => {
        if (view === 'pose') {
            if (refs.poseSelectionView) refs.poseSelectionView.style.display = 'block';
            if (refs.sceneEditView) refs.sceneEditView.style.display = 'none';
        } else if (view === 'scene') {
            if (refs.poseSelectionView) refs.poseSelectionView.style.display = 'none';
            if (refs.sceneEditView) refs.sceneEditView.style.display = 'block';
        }
        
        console.log('[UIRenderer] ビュー切り替え:', view);
    };

    /**
     * セクション一覧を描画
     * @param {string} group - グループ名
     * @param {Object} sectionsData - セクションデータ { sectionName: { setName: {...} } }
     * @param {Array} selectedPoses - 選択中のポーズ配列
     * @param {Function} onSectionToggle - セクション切り替えコールバック
     * @param {Function} onCardClick - カードクリックコールバック
     */
    const renderSections = (group, sectionsData, selectedPoses, onSectionToggle, onCardClick) => {
        console.log('[UIRenderer] renderSections 開始');
        console.log('[UIRenderer] group:', group);
        console.log('[UIRenderer] sectionsData:', sectionsData);
        console.log('[UIRenderer] refs.sectionsContainer:', refs.sectionsContainer);
        
        if (!refs.sectionsContainer) {
            console.error('[UIRenderer] sectionsContainer が見つかりません');
            return;
        }
        
        refs.sectionsContainer.innerHTML = '';
        
        if (!sectionsData || Object.keys(sectionsData).length === 0) {
            console.warn('[UIRenderer] セクションデータが空です');
            refs.sectionsContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">セクションがありません</p>';
            return;
        }
        
        console.log('[UIRenderer] セクション数:', Object.keys(sectionsData).length);
        
        Object.entries(sectionsData).forEach(([sectionName, sets]) => {
            const isExpanded = window.StateManager.isSectionExpanded(group, sectionName);
            const setCount = Object.keys(sets).length;
            
            // セクションブロック
            const sectionBlock = document.createElement('div');
            sectionBlock.className = 'section-block';
            
            // セクションヘッダー
            const header = document.createElement('div');
            header.className = 'section-header';
            header.addEventListener('click', () => onSectionToggle(group, sectionName));
            
            const headerLeft = document.createElement('div');
            headerLeft.className = 'section-header-left';
            
            const toggleIcon = document.createElement('span');
            toggleIcon.className = `section-toggle-icon ${isExpanded ? 'expanded' : ''}`;
            toggleIcon.textContent = '▶';
            
            const title = document.createElement('span');
            title.className = 'section-title';
            title.textContent = `📂 ${sectionName}`;
            
            const count = document.createElement('span');
            count.className = 'section-count';
            count.textContent = `(${setCount}個)`;
            
            headerLeft.appendChild(toggleIcon);
            headerLeft.appendChild(title);
            headerLeft.appendChild(count);
            header.appendChild(headerLeft);
            
            // セクションコンテンツ
            const content = document.createElement('div');
            content.className = `section-content ${isExpanded ? 'expanded' : ''}`;
            
            if (isExpanded) {
                const cardGrid = document.createElement('div');
                cardGrid.className = 'card-grid';
                
                Object.entries(sets).forEach(([setName, setData]) => {
                    const card = document.createElement('div');
                    card.className = 'pose-card';
                    
                    const isSelected = selectedPoses.some(p => p.id === setName && p.group === group && p.section === sectionName);
                    if (isSelected) {
                        card.classList.add('selected');
                    }
                    
                    const imageDiv = document.createElement('div');
                    imageDiv.className = 'pose-card-image';
                    imageDiv.textContent = group === 'nsfw' ? '🔞' : '🤸';
                    
                    // 画像読み込み
                    if (setData.image) {
                        window.SetLoader.loadSetImage(setData.image).then(dataUrl => {
                            if (dataUrl) {
                                imageDiv.innerHTML = '';
                                const img = document.createElement('img');
                                img.src = dataUrl;
                                img.alt = setName;
                                img.style.width = '100%';
                                img.style.height = '100%';
                                img.style.objectFit = 'cover';
                                imageDiv.appendChild(img);
                            }
                        }).catch(err => {
                            console.warn('[UIRenderer] 画像読み込みエラー:', setName, err);
                        });
                    }
                    
                    const titleDiv = document.createElement('div');
                    titleDiv.className = 'pose-card-title';
                    titleDiv.textContent = setName;
                    
                    card.appendChild(imageDiv);
                    card.appendChild(titleDiv);
                    
                    if (isSelected) {
                        const badge = document.createElement('div');
                        badge.className = 'pose-card-badge';
                        const order = selectedPoses.findIndex(p => p.id === setName && p.group === group && p.section === sectionName) + 1;
                        badge.textContent = order;
                        card.appendChild(badge);
                    }
                    
                    card.addEventListener('click', () => onCardClick(group, sectionName, setName, setData));
                    
                    cardGrid.appendChild(card);
                });
                
                content.appendChild(cardGrid);
            }
            
            sectionBlock.appendChild(header);
            sectionBlock.appendChild(content);
            refs.sectionsContainer.appendChild(sectionBlock);
        });
        
        console.log('[UIRenderer] セクション描画完了:', group, Object.keys(sectionsData).length);
    };

    /**
     * グループタブのアクティブ状態を更新
     * @param {string} activeGroup - アクティブグループ名
     */
    const updateGroupTabs = (activeGroup) => {
        if (!refs.groupTabs) return;
        
        const tabs = refs.groupTabs.querySelectorAll('.group-tab');
        tabs.forEach(tab => {
            const group = tab.dataset.group;
            if (group === activeGroup) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        console.log('[UIRenderer] グループタブ更新:', activeGroup);
    };

    // 公開API
    return {
        initRefs,
        renderPoseCards,
        renderSceneCards,
        renderSceneDetail,
        updateStats,
        updatePreview,
        renderStoryList,
        setStatus,
        switchView,
        renderSections,
        updateGroupTabs
    };
})();

// グローバルに公開
window.UIRenderer = UIRenderer;

