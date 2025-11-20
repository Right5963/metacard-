# metacard プロジェクト状況 (2025-10-26 最終版)

## プロジェクト概要
AIイラスト生成用プロンプト分類・ワイルドカード生成ツール

## 最新統計（修正版）
- **合計キーワード数**: 620
- **characterface**: 88キーワード
- **clothing**: 97キーワード
- **poseemotion**: 322キーワード
- **backgrounds**: 67キーワード
- **characterbody**: 46キーワード

## 重要な修正 (2025-10-26)

### カテゴリ分類の整理
**ユーザー指摘**: 「口のやつは表情だろ」

**修正内容**:
- 口関連キーワードを **characterface から poseemotion へ移動**
- **characterface**: 唇の装飾のみ残す (lips, lipstick, lip gloss)
- **poseemotion**: 表情として以下を統合
  - 口の表情: open mouth, closed mouth, pout, pursed lips
  - 歯・牙: teeth, fang, sharp_teeth, skin_fang等
  - 舌: tongue, tongue_out, licking_tongue_out
  - 口の形状: heart-shaped_mouth, triangle_mouth, wavy_mouth等
  - 手と口: finger_to_mouth, covering_own_mouth, mouth_hold
  - 口の動作・キス: drink, eating, kiss, french_kiss, pocky_kiss等

### 分類の基本方針
- **characterface**: 物理的特徴・装飾（髪型、目の色、髪色、リップなど）
- **poseemotion**: 表情・動作・感情（口の表情、歯・舌の見え方含む）

## キーワード追加履歴（合計 +192個）

### 1. アングル・視点・構図 (+63個)
from above, from below, dutch angle, pov, cowboy shot等

### 2. ポーズ・動作・戦闘・魔法 (+71個)
t-pose, a_pose, fighting, levitation, magic等

### 3. 座り方バリエーション (+25個)
butterfly_sitting, lotus_position, dogeza, wariza等

### 4. 頭・髪の動作 (+33個)
- 頭の位置・動作: head_down, head_rest, head_tilt等
- 髪の動作: hairdressing, hair_flip, tying_hair等

### 5. 口の表情・キス (+35個 → poseemotion)
- 口の表情: open mouth, closed mouth, pout, teeth, tongue等
- キス: kiss, french_kiss, pocky_kiss, tiptoe_kiss等

## poseemotion カテゴリの最終構成（322個）
- 基本ポーズ
- 動的ポーズ
- 座り方
- 寝姿勢
- 視線・顔の向き
- **アングル・視点・構図** (63個)
- 手・腕の位置
- 頭の位置・動作
- 髪の動作
- 脚の位置
- **表情** (基本表情 + **口の表情**)
- 感情・状態
- 特殊表情
- **口の動作・インタラクション**
- **戦闘・アクション**
- **特殊効果・魔法**
- その他

## 開発完了フェーズ
- ✅ Phase 1: キーワード辞書 (keyword_database.py)
- ✅ Phase 2: 分類エンジン (prompt_classifier.py)
- ✅ Phase 3: テキスト抽出機能 (text_extractor.py)
- ✅ Phase 4: GUI (gui_app.py) - 2モード対応
- ✅ Phase 5: 統合テスト (test_integration.py)

## テスト結果
```
characterface       :   88 keywords
clothing            :   97 keywords
poseemotion         :  322 keywords
backgrounds         :   67 keywords
characterbody       :   46 keywords

Total: 620 keywords
```

テスト確認: 'smile' が poseemotion に正しく分類

## ファイル構成
```
C:\metacard\
├── CLAUDE.md                        # プロジェクト記憶
├── README.md                        # ユーザー向けドキュメント
├── keyword_database.py              # キーワード辞書 (620個)
├── prompt_classifier.py             # 分類エンジン
├── text_extractor.py                # テキスト抽出
├── gui_app.py                       # GUIアプリ
├── test_phase12.py                  # Phase 1,2 テスト
├── test_integration.py              # 統合テスト
├── requirements.txt                 # PyYAML==6.0.1
├── input/                           # サンプル入力ファイル
└── output/                          # 出力先
```

## 学び・改善点
1. **カテゴリ分類の明確化**: 表情は poseemotion、物理的特徴は characterface
2. **ユーザーフィードバックの重要性**: 分類ルールの見直しに役立った
3. **テストの重要性**: 分類結果で正しさを確認できた

## 次のステップ
- ユーザーからの追加キーワード画像待ち
- 必要に応じてさらなるカテゴリ拡張対応可能
