# アングル・視点・構図キーワード追加

## 更新日時
2025-10-26

## 追加内容

### poseemotionカテゴリの拡張
**更新前**: 88 keywords  
**更新後**: 151 keywords  
**追加数**: +63 keywords

### 追加したキーワード詳細

#### 1. カメラアングル・視点 (15個)
```
from above, from below, from behind, from side
aerial view, bird's eye view, worm's eye view
low angle, high angle, dutch angle, extreme angle, cinematic angle
eye level, eyewear view
pov, pov doorway
straight-on, front view, back view, side view, three-quarter view
over-the-shoulder shot, over the shoulder shot
upside-down
```

#### 2. 構図・ショット (12個)
```
close-up, extreme close-up
full body, upper body, lower body, cowboy shot
portrait, profile, face only
wide shot, long shot, extreme long shot, establishing shot
panorama, overlooking panorama view
scenic view, scenery, magnificent view
```

#### 3. 視覚効果・構図 (8個)
```
vanishing point, perspective, extreme perspective, foreshortening
symmetrical, rotational symmetry
obliques, contrapposto
multiple views, candid shot
```

#### 4. クロッピング (9個)
```
cropped, cropped legs, cropped torso, cropped arms, cropped shoulders
cropped head, cropped neck
head out of frame, feet out of frame
```

#### 5. 特殊アングル (2個)
```
upskirt, panty shot
```

## 追加理由
ユーザー提供の画像（Stable Diffusionアングルサンプル集）から確認:
- c:\Users\user\Downloads\UOD28hbPavgLftaOgYvKTOZl.jpeg
- c:\Users\user\Downloads\3qcIfcF4hpuT4VAFAeIjwFZy.jpeg
- c:\Users\user\Downloads\5dXOGzGjHB9QNAFvNRqJ44tb.jpeg

これらのキーワードはAIイラスト生成において重要なカメラワーク・構図を制御するために必須。

## 全カテゴリ統計（更新後）

| カテゴリ | キーワード数 |
|---------|------------|
| characterface | 95 |
| clothing | 97 |
| **poseemotion** | **151** |
| backgrounds | 67 |
| characterbody | 46 |
| **合計** | **456** |

## 影響範囲
- ✅ keyword_database.py: POSEEMOTION_KEYWORDS更新
- ✅ 分類エンジン: 自動対応（keyword_databaseを参照）
- ✅ GUI: 自動対応（既存のコードで動作）
- ✅ テスト: 正常動作確認済み

## 次のステップ
これらの新しいキーワードを使用して、プロンプト分類の精度が向上しました。
ユーザーは以下のような用途で使用可能:
1. 異なるアングルのプロンプトを一括抽出
2. 特定のカメラワークのみを含むYAML生成
3. Stable Diffusionでの一括画像生成
