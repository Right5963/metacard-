// story-prompt.js - メインロジック
// 責任: 初期化、イベントリスナー登録、モジュール統合

(function () {
    'use strict';

    console.log('='.repeat(60));
    console.log('ストーリープロンプトシステム v2.0 起動');
    console.log('='.repeat(60));

    // DOM参照
    const refs = {};

    // ========================================
    // 初期化
    // ========================================
    
    const initRefs = () => {
        // ポーズ選択
        refs.poseGroupSelect = document.getElementById('poseGroupSelect');
        refs.poseSectionSelect = document.getElementById('poseSectionSelect');
        refs.poseCardsContainer = document.getElementById('poseCardsContainer');
        
        // カテゴリタブ
        refs.categoryTabs = document.querySelectorAll('.category-tab');
        
        // グループタブ
        refs.groupTabs = document.querySelectorAll('.group-tab');
        
        // ツールバーボタン
        refs.returnBtn = document.getElementById('returnBtn');
        refs.libraryBtn = document.getElementById('libraryBtn');
        refs.clearSelectionBtn = document.getElementById('clearSelectionBtn');
        refs.exportBtn = document.getElementById('exportBtn');
        refs.copyPromptBtn = document.getElementById('copyPromptBtn');
        refs.saveStoryBtn = document.getElementById('saveStoryBtn');
        
        // シーン操作ボタン
        refs.selectAllBtn = document.getElementById('selectAllBtn');
        refs.deselectAllBtn = document.getElementById('deselectAllBtn');
        refs.clearAllBtn = document.getElementById('clearAllBtn');
        refs.reloadPosesBtn = document.getElementById('reloadPosesBtn');
        
        // ライブラリ
        refs.libraryPanel = document.getElementById('libraryPanel');
        refs.libraryMask = document.getElementById('libraryMask');
        refs.libraryCloseBtn = document.getElementById('libraryCloseBtn');
        refs.refreshLibraryBtn = document.getElementById('refreshLibraryBtn');
        refs.createStoryBtn = document.getElementById('createStoryBtn');
        refs.newStoryTitleInput = document.getElementById('newStoryTitleInput');
        
        // その他
        refs.showExplanationToggle = document.getElementById('showExplanationToggle');
        refs.sceneTypeRadios = document.querySelectorAll('input[name="sceneType"]');
        refs.clothingStateBtns = document.querySelectorAll('.state-btn');
        
        console.log('[Main] DOM参照初期化完了');
    };

    // ========================================
    // イベントハンドラ
    // ========================================
    
    const handleReturnToMain = () => {
        console.log('[Main] メイン画面に戻る');
        
        // iframeで開かれている場合は親ウィンドウのオーバーレイを閉じる
        if (window.parent !== window) {
            const overlay = window.parent.document.getElementById('storyPromptOverlay');
            if (overlay) {
                overlay.remove();
                return;
            }
        }
        
        // 直接開かれている場合はメイン画面に遷移
        window.location.href = '../index.html';
    };

    const handleLibraryToggle = () => {
        const isOpen = refs.libraryPanel.classList.contains('open');
        if (isOpen) {
            refs.libraryPanel.classList.remove('open');
            refs.libraryMask.style.display = 'none';
            console.log('[Main] ライブラリパネル閉じる');
        } else {
            refs.libraryPanel.classList.add('open');
            refs.libraryMask.style.display = 'block';
            loadStoryList();
            console.log('[Main] ライブラリパネル開く');
        }
    };

    const handleClearSelection = () => {
        if (!confirm('すべての選択をクリアしますか？')) return;
        
        window.StateManager.updateState({
            selectedPoses: [],
            scenes: [],
            activeSceneId: null
        });
        
        renderAll();
        window.UIRenderer.switchView('pose');
        window.UIRenderer.setStatus('選択をクリアしました', 'success');
        console.log('[Main] 選択クリア');
    };

    const handleCopyPrompt = async () => {
        const state = window.StateManager.getState();
        const text = window.PreviewGenerator.generateExportPrompt(state.scenes);
        
        if (!text) {
            window.UIRenderer.setStatus('コピーするプロンプトがありません', 'error');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(text);
            window.UIRenderer.setStatus('プロンプトをコピーしました', 'success');
            console.log('[Main] プロンプトコピー成功');
        } catch (error) {
            console.error('[Main] コピーエラー:', error);
            window.UIRenderer.setStatus('コピーに失敗しました', 'error');
        }
    };

    const handleSaveStory = async () => {
        const state = window.StateManager.getState();
        
        const storyData = {
            id: state.storyId,
            title: state.storyTitle || '無題のストーリー',
            globalSettings: state.globalSettings,
            sceneType: state.sceneType,
            scenes: state.scenes
        };
        
        const result = await window.StorageManager.saveStory(storyData);
        
        if (result.success) {
            window.StateManager.updateState({ storyId: result.storyId });
            window.UIRenderer.setStatus('ストーリーを保存しました', 'success');
            console.log('[Main] ストーリー保存成功:', result.storyId);
        } else {
            window.UIRenderer.setStatus('保存に失敗しました', 'error');
            console.error('[Main] ストーリー保存失敗:', result.error);
        }
    };

    const handlePoseGroupChange = () => {
        const group = refs.poseGroupSelect.value;
        console.log('[Main] ポーズグループ変更:', group);
        
        // セッション一覧を更新
        updatePoseSections(group);
        
        // カード表示をクリア
        refs.poseCardsContainer.innerHTML = '';
    };
    
    const handlePoseSectionChange = () => {
        const group = refs.poseGroupSelect.value;
        const section = refs.poseSectionSelect.value;
        
        if (!section) {
            refs.poseCardsContainer.innerHTML = '';
            return;
        }
        
        console.log('[Main] ポーズセッション変更:', group, section);
        renderPoseCards(group, section);
    };
    
    const updatePoseSections = (group) => {
        console.log('[Main] updatePoseSections 開始:', group);
        console.log('[Main] refs.poseSectionSelect:', refs.poseSectionSelect);
        
        if (!refs.poseSectionSelect) {
            console.error('[Main] poseSectionSelect が見つかりません！');
            return;
        }
        
        const state = window.StateManager.getState();
        console.log('[Main] state:', state);
        
        const poseData = state.availableSets.pose;
        console.log('[Main] poseData:', poseData);
        
        if (!poseData) {
            console.error('[Main] poseData が null/undefined');
            refs.poseSectionSelect.innerHTML = '<option value="">セッションを選択...</option>';
            return;
        }
        
        if (!poseData.groups) {
            console.error('[Main] poseData.groups が存在しません');
            console.error('[Main] poseData の内容:', Object.keys(poseData));
            refs.poseSectionSelect.innerHTML = '<option value="">セッションを選択...</option>';
            return;
        }
        
        if (!poseData.groups[group]) {
            console.error('[Main] グループが存在しません:', group);
            console.error('[Main] 利用可能なグループ:', Object.keys(poseData.groups));
            refs.poseSectionSelect.innerHTML = '<option value="">セッションを選択...</option>';
            return;
        }
        
        const sections = poseData.groups[group].sections || {};
        console.log('[Main] sections:', sections);
        console.log('[Main] セクション数:', Object.keys(sections).length);
        
        refs.poseSectionSelect.innerHTML = '<option value="">セッションを選択...</option>';
        
        Object.keys(sections).forEach(sectionName => {
            const option = document.createElement('option');
            option.value = sectionName;
            option.textContent = sectionName;
            refs.poseSectionSelect.appendChild(option);
            console.log('[Main] セクション追加:', sectionName);
        });
        
        console.log('[Main] セッション更新完了:', group, refs.poseSectionSelect.options.length - 1, '個');
    };
    
    const addSceneFromPose = (group, section, setName, setData) => {
        const state = window.StateManager.getState();
        
        // シーンを作成
        const scene = {
            id: `scene_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            poseSet: setName,
            poseGroup: group,
            poseSection: section,
            title: setName,
            poseTags: setData.tags || [],
            backgroundSet: state.globalSettings.background,
            expressionSet: null,
            clothingSet: state.globalSettings.clothing,
            clothingState: 'normal',
            notes: ''
        };
        
        window.StateManager.addScene(scene);
        
        // 最初のシーンなら自動的にアクティブに
        if (state.scenes.length === 0) {
            window.StateManager.updateState({ activeSceneId: scene.id });
        }
        
        console.log('[Main] シーン追加:', scene.id, setName);
    };
    
    const removeSceneByPose = (group, section, setName) => {
        const state = window.StateManager.getState();
        const sceneToRemove = state.scenes.find(s => 
            s.poseSet === setName && s.poseGroup === group && s.poseSection === section
        );
        
        if (sceneToRemove) {
            window.StateManager.deleteScene(sceneToRemove.id);
            console.log('[Main] シーン削除:', sceneToRemove.id, setName);
        }
    };
    
    const updateSceneList = () => {
        const state = window.StateManager.getState();
        const sceneCardsList = document.getElementById('sceneCardsList');
        const individualSceneCard = document.getElementById('individualSceneCard');
        
        if (!sceneCardsList) return;
        
        // シーン一覧を描画
        sceneCardsList.innerHTML = '';
        
        if (state.scenes.length === 0) {
            sceneCardsList.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">シーンがありません</p>';
            if (individualSceneCard) individualSceneCard.style.display = 'none';
        } else {
            state.scenes.forEach((scene, index) => {
                const item = document.createElement('div');
                item.className = 'scene-list-item';
                if (scene.id === state.activeSceneId) {
                    item.classList.add('active');
                }
                
                const title = document.createElement('span');
                title.className = 'scene-list-item-title';
                title.textContent = `${index + 1}. ${scene.title}`;
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'scene-list-item-delete';
                deleteBtn.textContent = '🗑️';
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.StateManager.deleteScene(scene.id);
                    updateSceneList();
                    updatePreview();
                });
                
                item.appendChild(title);
                item.appendChild(deleteBtn);
                
                item.addEventListener('click', () => {
                    window.StateManager.updateState({ activeSceneId: scene.id });
                    updateSceneList();
                    renderSceneDetail();
                });
                
                sceneCardsList.appendChild(item);
            });
            
            // 個別シーン設定を表示
            if (individualSceneCard) individualSceneCard.style.display = 'block';
        }
        
        // アクティブシーンの詳細を描画
        renderSceneDetail();
        
        // 統計を更新
        updateStats();
    };
    
    const renderSceneDetail = () => {
        const scene = window.StateManager.getActiveScene();
        
        if (!scene) {
            console.log('[Main] アクティブシーンなし');
            return;
        }
        
        // タイトル更新
        const titleEl = document.getElementById('currentSceneTitle');
        if (titleEl) titleEl.textContent = scene.title;
        
        // セレクトボックス更新
        const bgSelect = document.getElementById('sceneBackgroundSelect');
        const exprSelect = document.getElementById('sceneExpressionSelect');
        const clothingSelect = document.getElementById('sceneClothingSelect');
        const notesInput = document.getElementById('sceneNotesInput');
        
        if (bgSelect) {
            bgSelect.value = scene.backgroundSet || '';
            bgSelect.onchange = () => {
                window.SceneManager.updateScene(scene.id, { backgroundSet: bgSelect.value });
                updatePreview();
            };
        }
        
        if (exprSelect) {
            exprSelect.value = scene.expressionSet || '';
            exprSelect.onchange = () => {
                window.SceneManager.updateScene(scene.id, { expressionSet: exprSelect.value });
                updatePreview();
            };
        }
        
        if (clothingSelect) {
            clothingSelect.value = scene.clothingSet || '';
            clothingSelect.onchange = () => {
                window.SceneManager.updateScene(scene.id, { clothingSet: clothingSelect.value });
                updatePreview();
            };
        }
        
        if (notesInput) {
            notesInput.value = scene.notes || '';
            notesInput.oninput = () => {
                window.SceneManager.updateScene(scene.id, { notes: notesInput.value });
            };
        }
        
        // 服装状態ボタン更新
        const stateBtns = document.querySelectorAll('.state-btn');
        stateBtns.forEach(btn => {
            if (btn.dataset.value === scene.clothingState) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
            
            btn.onclick = () => {
                stateBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                window.SceneManager.updateScene(scene.id, { clothingState: btn.dataset.value });
                updatePreview();
            };
        });
        
        console.log('[Main] シーン詳細描画:', scene.id);
    };

    const renderPoseCards = (group, section) => {
        const state = window.StateManager.getState();
        const poseData = state.availableSets.pose;
        
        if (!poseData || !poseData.groups || !poseData.groups[group] || !poseData.groups[group].sections || !poseData.groups[group].sections[section]) {
            console.warn('[Main] セッションデータがありません:', group, section);
            refs.poseCardsContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">データがありません</p>';
            return;
        }
        
        const sets = poseData.groups[group].sections[section];
        refs.poseCardsContainer.innerHTML = '';
        
        Object.entries(sets).forEach(([setName, setData]) => {
            const card = document.createElement('div');
            card.className = 'pose-card';
            
            const imageDiv = document.createElement('div');
            imageDiv.className = 'pose-card-image';
            imageDiv.textContent = '🤸';
            
            // 画像読み込み
            if (setData.image) {
                window.SetLoader.loadSetImage(setData.image).then(dataUrl => {
                    if (dataUrl) {
                        imageDiv.innerHTML = '';
                        const img = document.createElement('img');
                        img.src = dataUrl;
                        img.alt = setName;
                        imageDiv.appendChild(img);
                    }
                }).catch(err => console.warn('[Main] 画像読み込みエラー:', err));
            }
            
            const titleDiv = document.createElement('div');
            titleDiv.className = 'pose-card-title';
            titleDiv.textContent = setName;
            
            const tagsDiv = document.createElement('div');
            tagsDiv.className = 'pose-card-tags';
            tagsDiv.textContent = (setData.tags || []).join(', ');
            
            card.appendChild(imageDiv);
            card.appendChild(titleDiv);
            card.appendChild(tagsDiv);
            
            card.addEventListener('click', () => {
                const wasSelected = card.classList.contains('selected');
                
                if (wasSelected) {
                    // 選択解除 - シーン削除
                    card.classList.remove('selected');
                    removeSceneByPose(group, section, setName);
                } else {
                    // 選択 - シーン追加
                    card.classList.add('selected');
                    addSceneFromPose(group, section, setName, setData);
                }
                
                updateSceneList();
                updatePreview();
            });
            
            refs.poseCardsContainer.appendChild(card);
        });
        
        console.log('[Main] ポーズカード描画完了:', Object.keys(sets).length);
    };

    const handleCategoryTabClick = (category) => {
        console.log('[Main] カテゴリ切り替え:', category);
        window.StateManager.updateState({ currentCategory: category });
        
        // カテゴリタブのアクティブ状態を更新
        refs.categoryTabs.forEach(tab => {
            if (tab.dataset.category === category) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // グループタブの表示/非表示（ポーズのみ表示）
        const groupTabsContainer = document.getElementById('groupTabs');
        if (groupTabsContainer) {
            groupTabsContainer.style.display = category === 'pose' ? 'flex' : 'none';
        }
        
        renderCurrentCategory();
    };

    const handleGroupTabClick = (group) => {
        console.log('[Main] グループ切り替え:', group);
        window.StateManager.updateState({ currentGroup: group });
        window.UIRenderer.updateGroupTabs(group);
        renderPoseSections();
    };

    const handleSectionToggle = (group, section) => {
        console.log('[Main] セクション切り替え:', group, section);
        window.StateManager.toggleSection(group, section);
        renderPoseSections();
    };

    const handlePoseCardClick = (group, section, setName, setData) => {
        const state = window.StateManager.getState();
        const index = state.selectedPoses.findIndex(p => p.id === setName && p.group === group && p.section === section);
        
        if (index >= 0) {
            // 選択解除
            const newSelectedPoses = [...state.selectedPoses];
            newSelectedPoses.splice(index, 1);
            
            const newScenes = state.scenes.filter(s => !(s.poseSet === setName && s.poseGroup === group && s.poseSection === section));
            
            window.StateManager.updateState({
                selectedPoses: newSelectedPoses,
                scenes: newScenes
            });
            
            console.log('[Main] ポーズ選択解除:', setName);
        } else {
            // 選択
            const order = state.selectedPoses.length + 1;
            const newPose = {
                id: setName,
                group: group,
                section: section,
                title: setName,
                tags: setData.tags || [],
                order
            };
            
            window.StateManager.updateState({
                selectedPoses: [...state.selectedPoses, newPose]
            });
            
            // シーン自動生成
            const scene = window.SceneManager.createScene({
                id: setName,
                name: setName,
                group: group,
                section: section,
                tags: setData.tags || []
            });
            window.StateManager.addScene(scene);
            
            if (!state.activeSceneId) {
                window.StateManager.updateState({ activeSceneId: scene.id });
            }
            
            console.log('[Main] ポーズ選択:', poseSet.name);
        }
        
        renderAll();
        
        // ポーズが選択されたらシーン編集画面に切り替え
        const updatedState = window.StateManager.getState();
        if (updatedState.selectedPoses.length > 0 && updatedState.currentView === 'pose') {
            window.StateManager.updateState({ currentView: 'scene' });
            window.UIRenderer.switchView('scene');
        }
    };

    const handleSceneCardClick = (sceneId) => {
        window.StateManager.updateState({ activeSceneId: sceneId });
        renderSceneDetail();
        console.log('[Main] シーン選択:', sceneId);
    };

    const handleClothingStateChange = (stateValue) => {
        const scene = window.StateManager.getActiveScene();
        if (scene) {
            window.SceneManager.updateScene(scene.id, { clothingState: stateValue });
            renderSceneDetail();
            updatePreview();
            console.log('[Main] 服装状態変更:', stateValue);
        }
    };

    const handleSceneTypeChange = (e) => {
        window.StateManager.updateState({ sceneType: e.target.value });
        updateStats();
        updatePreview();
        console.log('[Main] シーンタイプ変更:', e.target.value);
    };

    const handleReloadPoses = () => {
        window.StateManager.updateState({ currentView: 'pose' });
        window.UIRenderer.switchView('pose');
        window.UIRenderer.setStatus('ポーズ選択画面に戻りました', 'info');
        console.log('[Main] ポーズ選択画面に戻る');
    };

    const loadStoryList = async () => {
        const stories = await window.StorageManager.listStories();
        window.UIRenderer.renderStoryList(stories, loadStory);
        console.log('[Main] ストーリー一覧読み込み:', stories.length);
    };

    const loadStory = async (storyId) => {
        const story = await window.StorageManager.loadStory(storyId);
        
        if (story) {
            applyStoryData(story);
            handleLibraryToggle(); // パネルを閉じる
            window.UIRenderer.setStatus('ストーリーを読み込みました', 'success');
            console.log('[Main] ストーリー読み込み成功:', storyId);
        } else {
            window.UIRenderer.setStatus('読み込みに失敗しました', 'error');
            console.error('[Main] ストーリー読み込み失敗:', storyId);
        }
    };

    const applyStoryData = (story) => {
        window.StateManager.updateState({
            storyId: story.id,
            storyTitle: story.title,
            globalSettings: story.globalSettings || {},
            sceneType: story.sceneType || 'normal',
            scenes: story.scenes || [],
            selectedPoses: (story.scenes || []).map((scene, index) => ({
                id: scene.poseId,
                title: scene.title,
                tags: scene.poseTags || [],
                order: index + 1
            }))
        });
        
        if (story.scenes && story.scenes.length > 0) {
            window.StateManager.updateState({
                activeSceneId: story.scenes[0].id,
                currentView: 'scene'
            });
            window.UIRenderer.switchView('scene');
        }
        
        renderAll();
        console.log('[Main] ストーリーデータ適用完了');
    };

    // ========================================
    // UI更新
    // ========================================
    
    const renderPoseSections = () => {
        const state = window.StateManager.getState();
        const poseData = state.availableSets.pose;
        
        console.log('[Main] renderPoseSections 開始');
        console.log('[Main] poseData:', poseData);
        
        if (!poseData) {
            console.error('[Main] ポーズデータが null/undefined');
            return;
        }
        
        if (!poseData.groups) {
            console.error('[Main] poseData.groups が存在しません。poseData:', poseData);
            return;
        }
        
        const currentGroup = state.currentGroup;
        console.log('[Main] currentGroup:', currentGroup);
        
        if (!poseData.groups[currentGroup]) {
            console.error(`[Main] グループ "${currentGroup}" が存在しません。利用可能なグループ:`, Object.keys(poseData.groups));
            return;
        }
        
        const sectionsData = poseData.groups[currentGroup]?.sections || {};
        console.log('[Main] sectionsData:', sectionsData);
        console.log('[Main] セクション数:', Object.keys(sectionsData).length);
        
        window.UIRenderer.renderSections(
            currentGroup,
            sectionsData,
            state.selectedPoses,
            handleSectionToggle,
            handlePoseCardClick
        );
        
        console.log('[Main] ポーズセクション描画完了:', currentGroup);
    };

    const renderAll = () => {
        const state = window.StateManager.getState();
        
        // ポーズセクション
        renderPoseSections();
        
        // シーンカード
        window.UIRenderer.renderSceneCards(
            state.scenes,
            state.activeSceneId,
            handleSceneCardClick
        );
        
        // シーン詳細
        renderSceneDetail();
        
        // 統計
        updateStats();
        
        // プレビュー
        updatePreview();
    };

    const renderSceneDetail = () => {
        const scene = window.StateManager.getActiveScene();
        if (scene) {
            window.UIRenderer.renderSceneDetail(scene);
        }
    };

    const updateStats = () => {
        const state = window.StateManager.getState();
        window.UIRenderer.updateStats({
            sceneCount: state.scenes.length,
            sceneType: state.sceneType
        });
    };

    const updatePreview = () => {
        const state = window.StateManager.getState();
        const showExplanation = refs.showExplanationToggle?.checked || false;
        
        const text = window.PreviewGenerator.generatePreview(state.scenes, {
            showExplanation,
            sceneType: state.sceneType
        });
        
        window.UIRenderer.updatePreview(text);
    };

    /**
     * セレクトボックスに選択肢を追加
     * @param {Object} allSets - 全カテゴリのセット
     */
    const populateSelectBoxes = async () => {
        console.log('[Main] セレクトボックス更新開始');
        
        // Electron APIを取得（iframe対応）
        const electronAPI = window.electronAPI || (window.parent && window.parent.electronAPI);
        if (!electronAPI) {
            console.error('[Main] Electron API が利用できません');
            return;
        }
        
        // グローバル設定のセレクトボックス
        const globalSelects = {
            face: document.getElementById('globalFaceSelect'),
            body: document.getElementById('globalBodySelect'),
            background: document.getElementById('globalBackgroundSelect'),
            clothing: document.getElementById('globalClothingSelect')
        };
        
        console.log('[Main] globalSelects:', globalSelects);
        
        // シーン個別設定のセレクトボックス
        const sceneSelects = {
            background: document.getElementById('sceneBackgroundSelect'),
            expression: document.getElementById('sceneExpressionSelect'),
            clothing: document.getElementById('sceneClothingSelect')
        };
        
        // 各カテゴリのセレクトボックスを更新
        for (const [category, select] of Object.entries(globalSelects)) {
            if (!select) {
                console.warn(`[Main] ${category} select要素が見つかりません`);
                continue;
            }
            
            // デフォルトオプションを残す
            select.innerHTML = '<option value="">セットを選択...</option>';
            
            try {
                // 直接IPCで読み込む
                const result = await electronAPI.loadCategorySets(category);
                console.log(`[Main] ${category} 受信:`, result);
                
                if (!result || !result.success) {
                    console.warn(`[Main] ${category} 読み込み失敗`);
                    continue;
                }
                
                let count = 0;
                
                // groups 形式 - フラットに全セットを表示
                if (result.groups) {
                    Object.values(result.groups).forEach(groupData => {
                        if (groupData.sections) {
                            Object.values(groupData.sections).forEach(sets => {
                                Object.keys(sets).forEach(setName => {
                                    const option = document.createElement('option');
                                    option.value = setName;
                                    option.textContent = setName;
                                    select.appendChild(option);
                                    count++;
                                });
                            });
                        }
                    });
                }
                
                console.log(`[Main] ${category} セレクトボックス更新完了: ${count}個`);
            } catch (error) {
                console.error(`[Main] ${category} 読み込みエラー:`, error);
            }
        }
        
        // シーン個別設定も同様に更新
        for (const [category, select] of Object.entries(sceneSelects)) {
            if (!select) {
                console.warn(`[Main] シーン${category} select要素が見つかりません`);
                continue;
            }
            
            select.innerHTML = '<option value="">セットを選択...</option>';
            
            try {
                const result = await electronAPI.loadCategorySets(category);
                
                if (!result || !result.success) {
                    continue;
                }
                
                let count = 0;
                
                if (result.groups) {
                    Object.values(result.groups).forEach(groupData => {
                        if (groupData.sections) {
                            Object.values(groupData.sections).forEach(sets => {
                                Object.keys(sets).forEach(setName => {
                                    const option = document.createElement('option');
                                    option.value = setName;
                                    option.textContent = setName;
                                    select.appendChild(option);
                                    count++;
                                });
                            });
                        }
                    });
                }
                
                console.log(`[Main] シーン${category} セレクトボックス更新完了: ${count}個`);
            } catch (error) {
                console.error(`[Main] シーン${category} 読み込みエラー:`, error);
            }
        }
        
        console.log('[Main] セレクトボックス更新完了');
    };

    // ========================================
    // イベントリスナー登録
    // ========================================
    
    const attachEventListeners = () => {
        // ポーズ選択
        if (refs.poseGroupSelect) refs.poseGroupSelect.addEventListener('change', handlePoseGroupChange);
        if (refs.poseSectionSelect) refs.poseSectionSelect.addEventListener('change', handlePoseSectionChange);
        
        // グループタブ
        refs.groupTabs.forEach(tab => {
            tab.addEventListener('click', () => handleGroupTabClick(tab.dataset.group));
        });
        
        // ツールバーボタン
        if (refs.returnBtn) refs.returnBtn.addEventListener('click', handleReturnToMain);
        if (refs.libraryBtn) refs.libraryBtn.addEventListener('click', handleLibraryToggle);
        if (refs.clearSelectionBtn) refs.clearSelectionBtn.addEventListener('click', handleClearSelection);
        if (refs.copyPromptBtn) refs.copyPromptBtn.addEventListener('click', handleCopyPrompt);
        if (refs.saveStoryBtn) refs.saveStoryBtn.addEventListener('click', handleSaveStory);
        
        // シーン操作ボタン
        if (refs.reloadPosesBtn) refs.reloadPosesBtn.addEventListener('click', handleReloadPoses);
        
        // ライブラリ
        if (refs.libraryCloseBtn) refs.libraryCloseBtn.addEventListener('click', handleLibraryToggle);
        if (refs.libraryMask) refs.libraryMask.addEventListener('click', handleLibraryToggle);
        if (refs.refreshLibraryBtn) refs.refreshLibraryBtn.addEventListener('click', loadStoryList);
        
        // プレビュー解説トグル
        if (refs.showExplanationToggle) {
            refs.showExplanationToggle.addEventListener('change', updatePreview);
        }
        
        // シーンタイプ
        refs.sceneTypeRadios.forEach(radio => {
            radio.addEventListener('change', handleSceneTypeChange);
        });
        
        // 服装状態ボタン
        refs.clothingStateBtns.forEach(btn => {
            btn.addEventListener('click', () => handleClothingStateChange(btn.dataset.state));
        });
        
        console.log('[Main] イベントリスナー登録完了');
    };

    // ========================================
    // メイン初期化
    // ========================================
    
    // デバッグ出力関数
    const debugLog = (message) => {
        console.log(message);
        const debugOutput = document.getElementById('debugOutput');
        if (debugOutput) {
            const timestamp = new Date().toLocaleTimeString();
            debugOutput.textContent += `[${timestamp}] ${message}\n`;
            debugOutput.scrollTop = debugOutput.scrollHeight;
        }
    };

    const init = async () => {
        console.log('[Main] 初期化開始');
        debugLog('🚀 初期化開始');
        
        // DOM参照初期化
        initRefs();
        window.UIRenderer.initRefs();
        debugLog('✅ DOM参照初期化完了');
        
        // イベントリスナー登録
        attachEventListeners();
        
        // セット読み込み
        window.UIRenderer.setStatus('セットを読み込んでいます...', 'info');
        const allSets = await window.SetLoader.loadAllSets();
        window.StateManager.updateState({ availableSets: allSets });
        
        console.log('[Main] 読み込まれたセット:', allSets);
        
        // デフォルトセクションを展開
        if (allSets.pose && allSets.pose.groups) {
            const defaultSections = Object.keys(allSets.pose.groups.default?.sections || {});
            console.log('[Main] 利用可能なセクション:', defaultSections);
            if (defaultSections.length > 0) {
                // 全セクションを展開
                defaultSections.forEach(section => {
                    window.StateManager.expandSection('default', section);
                });
                console.log('[Main] デフォルトセクション展開:', defaultSections);
            }
        }
        
        // セレクトボックスを更新
        console.log('[Main] populateSelectBoxes 呼び出し前');
        await populateSelectBoxes();
        console.log('[Main] populateSelectBoxes 呼び出し後');
        
        // ポーズセッション一覧を初期化（データ読み込み後）
        console.log('[Main] updatePoseSections 呼び出し');
        console.log('[Main] allSets.pose:', allSets.pose);
        if (allSets.pose && allSets.pose.groups) {
            updatePoseSections('default');
            console.log('[Main] updatePoseSections 完了');
        } else {
            console.error('[Main] ポーズデータが存在しません');
        }
        
        // 初期描画
        renderAll();
        
        // デバッグ: セレクトボックスの状態を確認
        setTimeout(() => {
            const faceSelect = document.getElementById('globalFaceSelect');
            const bodySelect = document.getElementById('globalBodySelect');
            const bgSelect = document.getElementById('globalBackgroundSelect');
            const clothingSelect = document.getElementById('globalClothingSelect');
            
            console.log('[Main] デバッグ: セレクトボックスの状態');
            console.log('  globalFaceSelect:', faceSelect ? `${faceSelect.options.length}個` : 'null');
            console.log('  globalBodySelect:', bodySelect ? `${bodySelect.options.length}個` : 'null');
            console.log('  globalBackgroundSelect:', bgSelect ? `${bgSelect.options.length}個` : 'null');
            console.log('  globalClothingSelect:', clothingSelect ? `${clothingSelect.options.length}個` : 'null');
            
            if (faceSelect && faceSelect.options.length > 0) {
                console.log('  faceSelect options:', Array.from(faceSelect.options).map(o => o.value));
            }
        }, 1000);
        
        window.UIRenderer.setStatus('準備完了', 'success');
        console.log('[Main] 初期化完了');
        console.log('='.repeat(60));
    };

    // DOMContentLoaded後に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
