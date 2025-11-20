// 学習補助: 表示中の全タグ（AI/非AI）を辞書とJSONに恒久保存
(function () {
  async function sha256Hex(text) {
    const enc = new TextEncoder();
    const buf = enc.encode(text);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function getCurrentImageKey() {
    // 1) プレビューdata URLがあればそれをキーに（従来互換）
    try {
      const prev = document.getElementById('previewImage');
      const src = prev && prev.src ? prev.src : '';
      if (src && src.startsWith('data:image/')) {
        return await sha256Hex(src);
      }
    } catch {}

    // 2) プレビューが未設定なら、現在の画像ファイルからdata URLを合成してハッシュ
    try {
      const file = (window.currentImageFile) ? window.currentImageFile : null;
      const toB64 = (typeof window.fileToBase64 === 'function') ? window.fileToBase64 : null;
      if (file && toB64) {
        const b64 = await toB64(file);
        const mime = file.type && file.type.startsWith('image/') ? file.type : 'image/png';
        const dataUrl = `data:${mime};base64,${b64}`;
        return await sha256Hex(dataUrl);
      }
    } catch {}

    // 3) 最後のフォールバック: プロンプトテキストのハッシュで代替
    const pos = (document.getElementById('positivePrompt')?.textContent || '').trim();
    const neg = (document.getElementById('negativePrompt')?.textContent || '').trim();
    const set = (document.getElementById('settingsPrompt')?.textContent || '').trim();
    const combined = [pos, neg, set].join('\n---\n');
    if (combined.length === 0) return null;
    return await sha256Hex(combined);
  }

  function ensureTag(container, text) {
    const exists = Array.from(container.querySelectorAll('.tag, .tag-item'))
      .some(n => (n.textContent || '').trim().toLowerCase() === text.toLowerCase());
    if (exists) return;
    const el = document.createElement('span');
    el.className = 'tag-item learned-overlay';
    el.textContent = text;
    el.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    el.style.border = '2px solid #34d399';
    el.style.cursor = 'default';
    container.appendChild(el);

    // 件数表示を更新（classifier.jsの関数があれば利用）
    try {
      const id = container.id || '';
      const cat = id.endsWith('-tags') ? id.substring(0, id.length - 5) : null;
      if (cat && typeof window.updateCategoryCount === 'function') {
        window.updateCategoryCount(cat);
      }
    } catch {}
  }

  function paintAllGreen(container) {
    const nodes = container.querySelectorAll('.tag, .tag-item');
    nodes.forEach(el => {
      el.classList.add('learned-overlay');
      el.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      el.style.border = '2px solid #34d399';
      el.style.color = '#fff';
    });
  }

  async function overlayPerImageLearnedTags() {
    try {
      const key = await getCurrentImageKey();
      if (!key || !window.electronAPI?.loadImageLearnedTags) return;
      const res = await window.electronAPI.loadImageLearnedTags(key);
      if (!res?.success || !res.tags) return;

      const catMap = {
        people: 'people-tags',
        face: 'face-tags',
        body: 'body-tags',
        pose: 'pose-tags',
        expression: 'expression-tags',
        background: 'background-tags',
        clothing: 'clothing-tags',
        quality: 'quality-tags',
        other: 'other-tags'
      };

      let applied = 0;
      Object.entries(catMap).forEach(([cat, id]) => {
        const container = document.getElementById(id);
        if (!container) return;
        const list = res.tags[cat] || [];
        // 学習データがあるカテゴリのみ置換・緑化
        if (Array.isArray(list) && list.length > 0) {
          container.innerHTML = '';
          list.forEach(t => ensureTag(container, t));
          paintAllGreen(container);
          applied++;
          try { addLearnedBadge(cat); } catch {}
        }
        // 学習データが無いカテゴリは既存の分類結果を保持（クリアしない）
      });
      try {
        if (applied > 0 && typeof window.showMessage === 'function') {
          window.showMessage(`🟢 学習タグを適用 (${applied}カテゴリ)`, 'success');
        }
      } catch {}
      // 念のため全カテゴリの件数を再計算
      try {
        if (typeof window.updateCategoryCount === 'function') {
          Object.keys(catMap).forEach(cat => window.updateCategoryCount(cat));
        }
      } catch {}

      // AI分類の自動保存（.ai-suggested が存在する場合）
      try {
        const anyAI = document.querySelector('.tag-item.ai-suggested');
        window.__savedAIKeys = window.__savedAIKeys || new Set();
        if (anyAI && !window.__savedAIKeys.has(key) && window.electronAPI?.saveImageLearnedTags) {
          const aiOnly = {};
          const m = {
            people: 'people-tags', face: 'face-tags', body: 'body-tags',
            pose: 'pose-tags', expression: 'expression-tags', background: 'background-tags',
            clothing: 'clothing-tags', quality: 'quality-tags', other: 'other-tags'
          };
          for (const [cat, id] of Object.entries(m)) {
            const el = document.getElementById(id);
            if (!el) continue;
            const tags = Array.from(el.querySelectorAll('.tag-item.ai-suggested')).map(n => (n.textContent || '').trim()).filter(Boolean);
            if (tags.length > 0) aiOnly[cat] = tags;
          }
          if (Object.keys(aiOnly).length > 0) {
            await window.electronAPI.saveImageLearnedTags(key, aiOnly);
            window.__savedAIKeys.add(key);
            console.log('[learn-all] AI配置を保存しました');
          }
        }
      } catch (e) {
        console.warn('[learn-all] AI配置の自動保存に失敗:', e);
      }

      console.log('[learn-all] 画像学習タグを重ね合わせました（置換表示）');
    } catch (e) {
      console.warn('[learn-all] 画像学習タグの重ね合わせ失敗:', e);
    }
  }

  function addLearnedBadge(category) {
    const box = document.querySelector(`.category-box[data-category="${category}"] .category-header`);
    if (!box) return;
    let badge = box.querySelector('.learned-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'learned-badge';
      badge.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      badge.style.color = '#fff';
      badge.style.padding = '4px 10px';
      badge.style.borderRadius = '6px';
      badge.style.fontSize = '12px';
      badge.style.marginLeft = '8px';
      badge.style.fontWeight = '600';
      badge.textContent = '学習適用';
      box.appendChild(badge);
    }
  }
  async function learnAllTagsToDictionary() {
    try {
      console.log('[learn-all] 全表示タグの辞書学習を開始');

      const categoryIds = ['people','face','body','pose','expression','background','clothing','quality','other'];
      const tagsByCategory = {};

      for (const cat of categoryIds) {
        const container = document.getElementById(`${cat}-tags`);
        if (!container) continue;
        const nodes = container.querySelectorAll('.tag, .tag-item');
        const tags = Array.from(nodes).map(n => (n.textContent || '').trim()).filter(Boolean);
        if (tags.length > 0) tagsByCategory[cat] = tags;
      }

      if (Object.keys(tagsByCategory).length === 0) {
        alert('❗ 学習対象のタグが見つかりません。分類後にお試しください。');
        return;
      }

      let totalAdded = 0;
      const results = [];
      for (const [category, tags] of Object.entries(tagsByCategory)) {
        const result = await window.electronAPI.appendToDictionary(category, tags);
        if (result && result.success) {
          totalAdded += result.addedCount || tags.length;
          results.push(`✅ ${category}: ${result.addedCount || tags.length}件 追加`);
        } else {
          results.push(`⚠️ ${category}: ${(result && result.error) || '失敗'}`);
        }
      }

      // JSONにも恒久保存（カテゴリ全体）
      await window.electronAPI.saveLearnedTags(tagsByCategory);

      // 画像ごとの学習タグも保存
      try {
        const key = await getCurrentImageKey();
        if (key && window.electronAPI?.saveImageLearnedTags) {
          await window.electronAPI.saveImageLearnedTags(key, tagsByCategory);
        }
      } catch (e) {
        console.warn('[learn-all] 画像キーの保存に失敗:', e);
      }

      alert([`📚 辞書学習が完了しました`, `合計 ${totalAdded} 件 追加`, ...results, ``, `💾 learned_tags.json に保存済み`].join('\n'));
      console.log('[learn-all] 完了:', { totalAdded, results });
    } catch (e) {
      console.error('[learn-all] エラー:', e);
      alert(`❌ 全タグ学習に失敗しました\n\n${e.message}`);
    }
  }

  if (typeof window !== 'undefined') {
    window.learnAllTagsToDictionary = learnAllTagsToDictionary;
    // 明示的に呼び出せるように公開（ドロップ直後に適用したいケースに対応）
    window.overlayPerImageLearnedTags = overlayPerImageLearnedTags;
    document.addEventListener('DOMContentLoaded', () => {
      // プロンプトが描画された後にオーバーレイ適用
      setTimeout(overlayPerImageLearnedTags, 500);
      // 変化監視（分類のたびに反映）
      const target = document.getElementById('positivePrompt');
      if (target) {
        const mo = new MutationObserver(() => overlayPerImageLearnedTags());
        mo.observe(target, { childList: true, subtree: true, characterData: true });
      }
    });
  }
})();
