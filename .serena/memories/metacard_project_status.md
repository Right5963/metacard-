# metacard プロジェクト状態（2025-10-26更新）

## プロジェクト概要
AIイラスト生成用プロンプトを自動分類し、YAML生成とテキスト抽出の2つの出力形式を提供するGUIツール。

## 現在の統計情報

### キーワード数（合計1020個）

| カテゴリ | 英語名 | キーワード数 | 主な内容 |
|---------|--------|------------|---------|
| 顔 | characterface | **105** | 髪型、前髪、髪の特徴、目の色、髪色、唇の装飾 |
| 服装 | clothing | **249** | 服、アクセサリー、職業装束、コスチューム、制服、服の状態・動作、露出・カットアウト、着脱状態、特殊な着衣 |
| ポーズ・表情 | poseemotion | **499** | 姿勢、動作、表情、アングル・視点、戦闘、手・腕・脚のポーズ、視線、インタラクション |
| 背景 | backgrounds | **67** | 場所、環境、シーン |
| 体の特徴 | characterbody | **100** | 年齢・性別、露出状態・裸体、露出部位、体型、胸部の詳細 |

**合計**: 1020キーワード

## 最新の追加（2025-10-26）

### 服装の状態・露出度・動作キーワード（+83個、clothing）
- 服の状態・動作: clothes_lift, skirt_lift, shirt_lift, dress_lift, clothing_aside, clothing_pull, clothing_grab, clothing_open, skirt_tug, panty_down, hood_down, buruma_pull, strap_lift, strap_pull, strap_slip, bra_lift, bra_pull, shirt_tucked_in, shirt_partially_tucked_in, tucked_skirt, untucked_shirt, button_gap, torn_clothes（23個）
- 開けた状態: unbuttoned, unfastened, untied, unzipped, unzipping, open_vest, open_collar, open_hoodie, open_jacket, center_opening（10個）
- 露出・カットアウト: off_shoulder, single_off_shoulder, shoulder_cutout, back_cutout, ass_cutout, cleavage_cutout, underboob_cutout, backless_outfit, bare_back, hip_vent, side_slit, pelvic_curtain, cross-laced_slit（13個）
- 袖: short_sleeves, long_sleeves, sleeves_rolled_up, sleeves_past_wrists, sleeves_past_fingers, low_cut_armhole（6個）
- 露出度高い服装: revealing_clothes, see-through_clothes, colorful_clothes, breastless_clothes, breast_curtains, nippleless_clothes, skinless_outfit, midriff_peek（8個）
- 着脱状態: naked, nude, topless, bottomless, underwear_only, skirt_around_one_leg, panty_around_one_leg, skirt_around_ankles, no_panties, no_bra（10個）
- 特殊な着衣状態: naked_apron, naked_bandage, naked_chocolate, naked_coat, naked_hoodie, naked_overalls, naked_ribbon, naked_sheet, naked_shirt, naked_suspenders, naked_tabard, naked_towel（12個）
- 胸元・下着関連: breast_slip, breast_out, nipple_slip, areola_slip, skirt_slip, tented_shirt（6個）
- その他の状態: detached_clothes, zettai_ryouiki（2個）

### 露出部位・体の表現キーワード（+16個、characterbody）
- 露出状態・裸体: completely_nude, nude_female, nude_male, clothed_female, clothed_male, topless_female, topless_male, bottomless_female, bottomless_male（9個）
- 露出部位: bare_arms, bare_shoulders, bare_legs, backboob, sideboob, underboob, pectorals（7個）

## プロジェクト構成

```
C:\metacard\
├── CLAUDE.md                        # プロジェクト記憶
├── README.md                        # 使用ガイド
├── keyword_database.py              # キーワード辞書（1020個）
├── prompt_classifier.py             # 分類エンジン
├── text_extractor.py                # テキスト抽出機能
├── gui_app.py                       # GUIアプリ（2モード）
├── requirements.txt                 # PyYAML依存
├── test_phase12.py                  # テストスクリプト
├── input/                           # 入力ファイル置き場
└── output/                          # 出力ファイル置き場
```

## 開発状況

### 完了済みフェーズ
- ✅ Phase 1: keyword_database.py（1020キーワード）
- ✅ Phase 2: prompt_classifier.py（分類エンジン）
- ✅ Phase 3: text_extractor.py（テキスト抽出）
- ✅ Phase 4: gui_app.py（GUI実装・2モード対応）
- ✅ Phase 5: 統合テスト

### 主要機能
1. **Mode A: YAML生成** - StabilityMatrix互換のワイルドカード形式
2. **Mode B: テキスト抽出** - カテゴリ別抽出、1ファイル=1行出力

## 起動方法
```bash
pip install -r requirements.txt
python gui_app.py
```

## 技術仕様
- **言語**: Python 3.7+
- **GUI**: Tkinter
- **依存**: PyYAML==6.0.1
- **分類方式**: セットベースキーワードマッチング（O(1)）
- **オフライン動作**: 完全スタンドアロン

## 次の展開可能性
- キーワード追加継続（ユーザー画像提供による）
- カテゴリ細分化検討
- 除外キーワード機能
- プリセット保存機能
