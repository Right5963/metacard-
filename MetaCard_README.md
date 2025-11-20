# MetaCard タグ仕分けルール（必ず参照・厳守）

## タグ仕分けの明確なルール

1. **character_face**
   - 髪型、目の色、髪色 のみを含めること。
   - 例：long hair, short hair, twintails, blue eyes, green eyes, brown hair, blonde hair など
   - 顔のパーツや表情（smile, blush, open mouth など）は含めない。

2. **character_body**
   - 上記以外の体の特徴をすべて含めること。
   - 例：thighs, breasts, armpits, bare shoulders, curvy, thick thighs, etc

3. **poseemotion**
   - ポーズと感情・表情を必ずセットで抽出し、1セットとして扱うこと。
   - 例：standing, sitting, looking back, smile, blush, open mouth, closed mouth, etc

4. **background**
   - 背景・場所・シチュエーションのみを含めること。
   - 例：indoors, pool, classroom, sky, ocean, etc

5. **sexual**
   - アダルト要素をセットでまとめること。
   - 例：cameltoe, cum, censored nipples, pussy, masturbation, breasts out, etc

---

## 運用ルール
- AIはタグ仕分けやYAML出力時、必ず本ファイルのルールを最優先で参照・厳守すること。
- ルールが曖昧な場合はユーザーに必ず確認を取ること。
- ルールが更新された場合は、必ずこのファイルを最新化し、以降の処理に反映すること。

---

（最終更新: 2024-04-29）
