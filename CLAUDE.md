# プロンプト分類・ワイルドカード生成ツール - プロジェクト記憶

## プロジェクト概要

### 目的
txtファイルからプロンプトを読み込み、6カテゴリに自動分類し、2つの出力形式を提供するツール。

### 主要機能
1. **YAML生成モード**: ワイルドカード形式（StabilityMatrix互換）
2. **テキスト抽出モード**: カテゴリ別抽出（Stable Diffusion "Prompts from file or textbox" 用）

---

## ディレクトリ構成

```
C:\metacard\
├── CLAUDE.md                        # このファイル（プロジェクト記憶）
├── 要件定義書_プロンプト分類ツール.md  # 要件定義
├── keyword_database.py              # Phase 1: キーワード辞書
├── prompt_classifier.py             # Phase 2: 分類エンジン
├── text_extractor.py                # Phase 3: テキスト抽出機能
├── gui_app.py                       # Phase 4: GUIアプリ
├── requirements.txt                 # 依存パッケージ
├── input/                           # 入力ファイル置き場
└── output/                          # 出力ファイル置き場
```

---

## 分類カテゴリ（6種類）

| カテゴリ名 | 英語名 | キーワード数 | 内容 |
|----------|--------|------------|------|
| 顔 | `characterface` | **105** | **髪型**（drill_hair/twin_drills/pointy_hair/spiked_hair/ringlets/hair_up/hair_down/asymmetrical_hair/sidecut等）、**前髪**（blunt_bangs/swept_bangs/parted_bangs/asymmetrical_bangs/hair_over_one_eye/hair_between_eyes等）、**髪の特徴**（hair_flaps/sidelocks/hair_intakes/blunt_ends/floating_hair/widow's_peak等）、目の色、髪色、唇の装飾 |
| 服装 | `clothing` | **285** | 服、アクセサリー、靴、下着、**職業・職業装束**（miko/nun/priestess/priest/witch/mage/wizard/ninja/samurai/waitress/office_lady/chef/idol/magical_girl/police/soldier/knight/teacher/housewife/princess/flight_attendant等）、**コスチューム**（bunny_girl/playboy_bunny/santa/halloween/vampire/ghost/superhero/kigurumi/halloween_costume等）、**動物着ぐるみ**（bear/cat/cow/dog/panda/rabbit/tiger等）、**制服**（school/military/gym/baseball/basketball/tennis/soccer等）、**特殊装備**（tuxedo/bikini_armor/armored_dress/leotard/pajamas/cyber_fashion等）、**服の状態・動作**（clothes_lift/skirt_lift/clothing_aside/clothing_pull/unbuttoned/unfastened/open_jacket/torn_clothes/torn_dress/torn_skirt等）、**露出・カットアウト**（off_shoulder/bare_back/backless_outfit/side_slit/hip_vent/pelvic_curtain等）、**着脱状態**（topless/bottomless/underwear_only/no_panties/no_bra/breasts_out等）、**特殊な着衣**（naked_apron/naked_shirt/naked_towel/zettai_ryouiki等）、**ブーツ・靴**（thigh_boots/high_heel_boots/black_footwear等）、**アクセサリー**（hairclip/jewelry/food-themed_hair_ornament等）、**柄・プリント**（bat_print/animal_print等） |
| ポーズ・表情 | `poseemotion` | **516** | 姿勢、動作、**表情**（口・歯・舌含む）、感情、**アングル・視点・構図**、**戦闘・アクション**、**特殊効果**、**座り方バリエーション**、**頭・髪の動作**、**口の動作・キス**、**手・腕の詳細ポーズ**（holding/hug/grab/hand_on/pointing/covering）、**手のシェイプ・特殊ポーズ**（peace_sign/heart_hands/jojo_pose/gendou_pose等）、**脚・足のポーズ・動作**（spread/crossed/lift/plantar_flexion/dorsiflexion/trampling/spread_pussy/spread_anus/spread_ass等）、**視線方向**（looking_to_the_side等）、**顔・体の視覚効果**（eyes_visible_through_hair/armpit_focus）、**incoming系インタラクション**（incoming_attack/punch/drink/food/gift/fed_by_viewer）、**性的動作**（female_masturbation/masturbation/sex/sex_from_behind/vaginal/object_insertion等） |
| 背景 | `backgrounds` | **81** | 場所、環境、シーン、**ハロウィン**（halloween/jack-o'-lantern/pumpkin/ghost/spider_web/silk/halloween_bucket等）、**天体・空**（moon/full_moon/night_sky等）、**自然**（bare_tree等）、**小道具**（food/candy等）、**動物**（bat_(animal)等） |
| 体の特徴 | `characterbody` | **116** | **年齢・性別**（boy/girl/man/woman/child/toddler/teenager/student/old_man/old_woman/mature_female/aged_down/aged_up/age_difference/shota/kemono等）、**人数**（1girl/1boy/solo/solo_focus/hetero等）、**露出状態・裸体**（completely_nude/nude_female/nude_male/topless_female/topless_male/bottomless_female/bottomless_male/clothed_female/clothed_male等）、**露出部位**（bare_arms/bare_shoulders/bare_legs/backboob/sideboob/underboob/pectorals等）、**体の主要部位**（breasts/nipples/pussy/anus/penis等）、**体の状態**（sweat/pussy_juice/shiny/shiny_skin/partially_visible_vulva/female_ejaculation等）、体型、肌の色、身長、**胸部の詳細**（形状・動作・インタラクション・測定） |
| その他 | `uncategorized` | - | 分類不能なタグ（censored/mosaic_censoring/dildo/sex_toy等） |

**合計キーワード数**: 1103

---

## 開発フェーズ

### Phase 1: キーワード辞書作成 ✅
- [x] keyword_database.py 作成済み
- [x] 6カテゴリのキーワードリスト定義完了
- [x] **アングル・視点・構図キーワード追加** (+63個) 2025-10-26
  - カメラアングル: from above, aerial view, pov, dutch angle等
  - 構図・ショット: close-up, full body, cowboy shot, panorama等
  - 視覚効果: perspective, symmetrical, foreshortening等
  - クロッピング: cropped, head out of frame等
  - **合計**: 456キーワード (393 → 456)
- [x] **ポーズ・動作・戦闘キーワード追加** (+71個) 2025-10-26
  - 基本ポーズ: t-pose, a_pose, handstand, yoga等
  - 動的ポーズ: singing, dancing, crawling, acrobatic_pose等
  - 視線: facing_viewer, facing_away, facing_back等
  - 戦闘・アクション: fighting, punching, kicking, duel等
  - 特殊効果・魔法: magic, levitation, telekinesis等
  - **合計**: 527キーワード (456 → 527)
- [x] **座り方バリエーションキーワード追加** (+25個) 2025-10-26
  - 座り方: indian_style, butterfly_sitting, lotus_position, dogeza等
  - 寝姿勢: fetal_position, prone, on_side, knee_up等
  - その他: on_one_knee, superhero_landing
  - **合計**: 552キーワード (527 → 552)
- [x] **頭・髪の動作キーワード追加** (+33個) 2025-10-26
  - 頭の位置・動作: head_down, head_rest, arm_support, head_tilt等
  - 髪の動作: hairdressing, tying_hair, hair_flip, hair_tucking等
  - **合計**: 585キーワード (552 → 585)
- [x] **口の表情・歯・舌・キスキーワード追加** (+38個) 2025-10-26
  - **characterface**: 唇の装飾のみ (lips, lipstick, lip gloss)
  - **poseemotion 表情セクション**に以下を統合:
    - 口の表情: open mouth, closed mouth, pout, pursed lips等
    - 歯・牙: teeth, fang, sharp_teeth, skin_fang等 (6個)
    - 舌: tongue, tongue_out, licking_tongue_out (3個)
    - 口の形状: heart-shaped_mouth, triangle_mouth, wavy_mouth等 (9個)
    - 手と口: finger_to_mouth, covering_own_mouth, mouth_hold等 (4個)
    - 口の動作・キス: drink, eating, kiss, french_kiss, pocky_kiss等 (16個)
  - **合計**: 620キーワード (585 → 620)
- [x] **手・腕の詳細ポーズキーワード追加** (+66個) 2025-10-26
  - 物を持つ: holding, holding_phone, holding_hand等 (5個)
  - 抱擁: hug, group_hug, hug_from_behind, mutual_hug等 (11個)
  - つかむ: grabbing, arm_grab, ass_grab, clothes_grab等 (19個)
  - 手を置く: hand_on_own_ear, hand_on_another's_head等 (15個拡張)
  - 指差し: pointing, pointing_at_viewer, pointing_up等 (9個)
  - 覆う: covering, covering_own_eyes, covering_head等 (9個拡張)
  - **合計**: 686キーワード (620 → 686)
- [x] **手のシェイプ・特殊ポーズキーワード追加** (+69個) 2025-10-26
  - 手を組む・握る: handshake, hands_together, interlocked_fingers等 (6個)
  - 挨拶・合図: beckoning, waving_at_viewer, salute, fist_bump等 (8個)
  - 手のシェイプ・ジェスチャー: peace_sign, thumbs_up, heart_hands, heart_hands_duo, heart_hands_trio, paw_pose, claw_pose, horns_pose, shadow_puppet, double_finger_gun, finger_frame, steepled_fingers等 (14個)
  - 手を差し出す・開く: outstretched_hand, offering_hand, spread_arms, open_arms_for_viewer, cupping_hands等 (8個)
  - 腕の位置バリエーション: arms_raised_in_the_air, arms_behind_head, v_arms, w_arms, x_arms (5個)
  - 指の動作・位置: cracking_knuckles, between_fingers, index_finger_raised, finger_counting等 (6個)
  - 特定の動作: raised_fist, reaching_towards_viewer, shushing, adjusting_eyewear, curtsey, carry_me等 (12個)
  - 特殊ポーズ: zombie_pose, gendou_pose, jojo_pose, konjou_pose, victory_pose, shyness_pose, djun_arms_pose, villain_pose, rabbit_pose等 (10個)
  - **合計**: 755キーワード (686 → 755)
- [x] **脚・足のポーズ・動作キーワード追加** (+28個) 2025-10-26
  - 脚の位置・組み方: legs_together, crossed_legs, crossed_ankles, knees_together_feet_apart, pigeon_toed (5個)
  - 脚を上げる・動かす: leg_up, legs_up, knees_to_chest, folded_legs, leg_lift, outstretched_leg (6個)
  - 開脚・ストレッチ: standing_split, split (2個)
  - 足の動作・位置: feet_up, plantar_flexion, dorsiflexion, heel_up, tiptoes, stepping (6個)
  - 足の特殊動作・インタラクション: tying_footwear, presenting_foot, spread_toes, hands_on_feet, trampling, soaking_feet, tickling_feet等 (9個)
  - **合計**: 783キーワード (755 → 783)
- [x] **胸部の詳細キーワード追加（characterbodyカテゴリ）** (+19個) 2025-10-26
  - 胸の形状・特徴: perky_breasts, sagging_breasts, pointy_breasts, veiny_breasts, unaligned_breasts, floating_breasts, bouncing_breasts等 (7個)
  - 胸の動作・インタラクション: breast_hold, breast_lift, breasts_squeezed_together, breast_suppress, groping, weighing_breasts (6個)
  - 胸に関する状態・意識: breast_conscious, breast_envy (2個)
  - 測定・その他: bust_chart, bust_measuring, flying_button, oversized_breast_cup (4個)
  - **合計**: 802キーワード (783 → 802)
- [x] **視線・表情・腕・incoming系インタラクションキーワード追加** (+14個) 2025-10-26
  - 腕の位置バリエーション: arm_behind_back, arm_up, arm_at_side (3個)
  - 手の位置: hand_on_own_chin (1個)
  - 視線: looking_to_the_side (1個)
  - 口の表情: parted_lips (1個)
  - 顔・体の視覚効果: eyes_visible_through_hair, armpit_focus (2個)
  - incoming系インタラクション: incoming_attack, incoming_punch, incoming_drink, incoming_food, incoming_gift, fed_by_viewer (6個)
  - **合計**: 816キーワード (802 → 816)
- [x] **髪型・前髪バリエーションキーワード追加（characterfaceカテゴリ）** (+17個) 2025-10-26
  - 髪型: twin_drills, pointy_hair, spiked_hair, ringlets, hair_up, hair_down, asymmetrical_hair, sidecut (8個)
  - 前髪: asymmetrical_bangs, hair_over_one_eye, hair_between_eyes (3個)
  - 髪の特徴: hair_flaps, sidelocks, hair_intakes, blunt_ends, floating_hair, widow's_peak (6個)
  - **合計**: 833キーワード (816 → 833)
- [x] **職業・コスチュー゠・制服キーワード追加（clothingカテゴリ）** (+69個) 2025-10-26
  - 制服: sailor_dress, gym_costume, military_uniform, plugsuit, baseball_uniform, basketball_uniform, tennis_uniform, soccer_uniform, fast_food_uniform, baby_kimono, haori (11個)
  - 職業・職業装束: miko, nun, priestess, priest, witch, mage, wizard, ninja, samurai, waitress, office_lady, chef, idol, magical_girl, police, soldier, knight, teacher, housewife, slave, princess, flight_attendant (22個)
  - コスチュー゠: bunny_girl, playboy_bunny, santa_costume, halloween_costume, vampire_costume, ghost_costume, superhero_costume, kigurumi, alternate_costume (9個)
  - 動物着ぐるみ: bear_costume, boar_costume, cat_costume, cow_costume, dog_costume, monkey_costume, mouse_costume, panda_costume, penguin_costume, pig_costume, rabbit_costume, reindeer_costume, seal_costume, sheep_costume, tiger_costume (15個)
  - 特殊装備・その他: tuxedo, tweed_outfit, bikini_armor, armored_dress, brand_uniform, leotard, pajamas, cyber_fashion, cowboy_western, biker_suit, racing_suit (11個)
  - **合計**: 902キーワード (833 → 902)
- [x] **年齢・性別・体型キーワード追加（characterbodyカテゴリ）** (+19個) 2025-10-26
  - 年齢・性別: boy, girl, man, woman, child, toddler, teenager, student, university_student, old_man, old_woman, mature_female, milf, aged_down, aged_up, age_difference, shota, kemono, kemono_shota (19個)
  - **合計**: 921キーワード (902 → 921)
- [x] **服装の状態・露出度・動作キーワード追加（clothingカテゴリ）** (+83個) 2025-10-26
  - 服の状態・動作: clothes_lift, skirt_lift, shirt_lift, dress_lift, clothing_aside, clothing_pull, clothing_grab, clothing_open, skirt_tug, panty_down, hood_down, buruma_pull, strap_lift, strap_pull, strap_slip, bra_lift, bra_pull, shirt_tucked_in, shirt_partially_tucked_in, tucked_skirt, untucked_shirt, button_gap, torn_clothes (23個)
  - 開けた状態: unbuttoned, unfastened, untied, unzipped, unzipping, open_vest, open_collar, open_hoodie, open_jacket, center_opening (10個)
  - 露出・カットアウト: off_shoulder, single_off_shoulder, shoulder_cutout, back_cutout, ass_cutout, cleavage_cutout, underboob_cutout, backless_outfit, bare_back, hip_vent, side_slit, pelvic_curtain, cross-laced_slit (13個)
  - 袖: short_sleeves, long_sleeves, sleeves_rolled_up, sleeves_past_wrists, sleeves_past_fingers, low_cut_armhole (6個)
  - 露出度高い服装: revealing_clothes, see-through_clothes, colorful_clothes, breastless_clothes, breast_curtains, nippleless_clothes, skinless_outfit, midriff_peek (8個)
  - 着脱状態: naked, nude, topless, bottomless, underwear_only, skirt_around_one_leg, panty_around_one_leg, skirt_around_ankles, no_panties, no_bra (10個)
  - 特殊な着衣状態: naked_apron, naked_bandage, naked_chocolate, naked_coat, naked_hoodie, naked_overalls, naked_ribbon, naked_sheet, naked_shirt, naked_suspenders, naked_tabard, naked_towel (12個)
  - 胸元・下着関連: breast_slip, breast_out, nipple_slip, areola_slip, skirt_slip, tented_shirt (6個)
  - その他の状態: detached_clothes, zettai_ryouiki (2個)
  - **合計**: 1004キーワード (921 → 1004)
- [x] **露出部位・体の表現キーワード追加（characterbodyカテゴリ）** (+16個) 2025-10-26
  - 露出状態・裸体: completely_nude, nude_female, nude_male, clothed_female, clothed_male, topless_female, topless_male, bottomless_female, bottomless_male (9個)
  - 露出部位: bare_arms, bare_shoulders, bare_legs, backboob, sideboob, underboob, pectorals (7個)
  - **合計**: 1020キーワード (1004 → 1020)

### Phase 2: 分類エンジン開発 ✅
- [x] prompt_classifier.py 作成済み
- [x] タグ分割・正規化処理実装
- [x] キーワードマッチング実装

### Phase 3: 出力機能開発 ✅
- [ ] YAML生成機能（Phase 4のGUIで統合実装予定）
- [x] **テキスト抽出機能（複数ファイル + カテゴリ選択）** ✅ 完了
- [x] ファイル保存処理 ✅ 完了
- [x] text_extractor.py 実装完了
  - 複数txtファイル対応
  - カテゴリ複数選択対応
  - 1ファイル = 1行出力

### Phase 4: GUI開発 ✅
- [x] **gui_app.py 作成完了** ✅
- [x] Tkinter GUI構築（メインウィンドウ + レイアウト）✅
- [x] ファイル/フォルダ選択ダイアログ ✅
- [x] カテゴリ選択チェックボックス（複数選択 + 全選択）✅
- [x] 2モード切替（YAML生成 / テキスト抽出）✅
- [x] プレビュー表示（ScrolledText）✅
- [x] クリップボードコピー機能 ✅
- [x] ファイル保存機能 ✅
- [x] 動作確認テスト完了 ✅
- [x] README.md 作成 ✅
- [x] test_gui.py 作成 ✅
- [x] **YAML生成機能の修正** ✅ 2025-10-26
  - 行ごとのタグ構造保持（1入力行 = 1YAMLエントリー）
  - StabilityMatrix互換形式対応
- [x] **ワイルドカード参照システムの実装** ✅ 2025-10-26
  - `character_main` セクション追加（全カテゴリ組み合わせテンプレート）
  - `__characterface__`, `__characterbody__` 等のワイルドカード参照対応
  - 2スペースインデント、ダブルクォート囲み統一
  - セクション順序規定（character_main → characterface → clothing → ...）

### Phase 5: テスト ✅
- [x] サンプルデータテスト ✅ 完了
- [x] 統合テスト (test_integration.py) ✅ 完了
  - 5つのサンプルプロンプトで分類動作確認
  - アングル・視点キーワード検出確認
  - 全カテゴリ正常動作
- [x] 新規追加キーワード動作確認 ✅ 完了
  - 71個のポーズ・動作・戦闘キーワード全て動作確認済み

---

## 技術仕様

### アーキテクチャ
- **形態**: スタンドアロンデスクトップアプリ（Tkinter）
- **ポート**: 不要（Webサーバーなし）
- **起動**: `.exe` または `python gui_app.py`
- **オフライン**: 完全オフライン動作

### 依存パッケージ
```
PyYAML==6.0.1
```

---

## 使用例

### モードA: YAML生成
```
入力: prompts.txt
↓
分類: 6カテゴリに自動分類
↓
出力: prompts_classified_20251010.yaml
```

### モードB: テキスト抽出
```
入力: フォルダ（複数txtファイル）
↓
カテゴリ選択: [✓] poseemotion のみ
↓
出力: 1ファイル = 1行のテキスト
all fours,open mouth,blush,:d,
looking at viewer,blush,looking back,...
```

---

## 重要な注意事項

### テキスト抽出機能の要件
1. **複数ファイル対応**: フォルダ内の全txtファイルを処理
2. **カテゴリ複数選択**: チェックボックスで複数カテゴリ選択可能
3. **1ファイル1行**: 各ファイルから抽出したタグを1行に並べる
4. **出力形式**: カンマ区切り、改行区切り

### 出力ファイル命名規則
- YAML: `prompts_classified_YYYYMMDD.yaml`
- テキスト抽出:
  - 単一カテゴリ: `prompts_extracted_poseemotion_20251010.txt`
  - 複数カテゴリ: `prompts_extracted_clothing+poseemotion_20251010.txt`
  - 全カテゴリ: `prompts_extracted_all_20251010.txt`

---

## 現在の状態

**Phase**: Phase 5（統合テスト）
**次のタスク**: 実際のサンプルデータで動作確認

**完了済み**:
- ✅ Phase 1: keyword_database.py
- ✅ Phase 2: prompt_classifier.py
- ✅ Phase 3: text_extractor.py
- ✅ Phase 4: gui_app.py（GUI実装完了・動作確認済み）
- ✅ README.md（使用ガイド）
- ✅ test_gui.py（動作確認テスト）
- ✅ requirements.txt

**進行中**:
- 🔄 Phase 5: 統合テスト

## 起動方法
```bash
# 依存パッケージインストール
pip install -r requirements.txt

# GUI起動
python gui_app.py
```

---

## 参照ドキュメント
- 要件定義書: `C:\metacard\要件定義書_プロンプト分類ツール.md`

---

## バグ修正履歴

### 2025-10-26: YAML生成機能の修正 ✅

**問題**: ユーザー報告「yaml生成のワイルドカードは　機能してませんｋが」
- YAML生成時に全行のタグが集約され、行ごとの構造が失われていた
- StabilityMatrixワイルドカード形式に非互換

**原因**: 
- `prompt_classifier.py`の`classify_file()`がset-based集約を行っていた
- 要件定義書では行ごとのタグ構造を保持する必要があった

**修正内容**:
1. `prompt_classifier.py`に`classify_file_for_yaml()`関数を追加
   - 行ごとのタグをカンマ区切り文字列のリストとして保持
   - 行構造を破壊せず、StabilityMatrix互換形式を生成
2. `gui_app.py`の`generate_yaml()`を更新
   - `classify_file()`から`classify_file_for_yaml()`に変更
   - `to_yaml_dict()`変換ステップを削除（不要になったため）

**修正前の出力（誤り）**:
```yaml
characterface:
  - blue eyes
  - brown eyes
  - green eyes
  - long hair
  # 全行が集約され、行構造が失われる
```

**修正後の出力（正しい）**:
```yaml
characterface:
  - long hair, blue eyes
  - short hair, red eyes
  - twin braids, green eyes
  # 行ごとの構造を保持
```

**テスト結果**: ✅ 正常動作確認済み
- `test_yaml_generation.py`で動作確認
- 4行入力 → 各カテゴリに4エントリー生成
- StabilityMatrixワイルドカード形式に完全互換


---

## 機能追加履歴

### 2025-10-26: YAML生成時の複数ファイル選択対応 ✅

**要望**: 「yaml生成するときに　テキストファイル選ぶわけですが　全部選べないのですが」

**追加機能**:
- Mode A（YAML生成モード）で複数のテキストファイルを一度に選択可能に
- Ctrl/Shiftキーで複数ファイル選択
- 全てのファイルから行を統合してYAML生成

**変更内容**:
1. `gui_app.py`の`select_file()`メソッド修正
   - `filedialog.askopenfilename()` → `filedialog.askopenfilenames()` に変更
   - `self.selected_path`がリストに対応
   - 選択ファイル数の表示に対応

2. `gui_app.py`の`generate_yaml()`メソッド修正
   - 複数ファイルからの全行読み込みに対応
   - 統計情報に「処理ファイル数」「処理行数」を追加

**使い方**:
```
1. Mode A: YAML生成モードを選択
2. ファイル選択ダイアログで：
   - 単一ファイル: 通常通りクリック
   - 複数ファイル: Ctrlキーを押しながら複数クリック
   - 範囲選択: Shiftキーを押しながらクリック
3. 実行
```

**変更ファイル**:
- gui_app.py: select_file()とgenerate_yaml()を修正
- README.md: 使い方セクションを更新

**追加ファイル**:
- 起動.bat: ダブルクリック起動用
- 起動（初回セットアップ付き）.bat: 環境チェック付き起動用

### 2025-10-26: ワイルドカード参照システムの実装 ✅

**問題**: YAMLファイルにワイルドカード参照テンプレート（character_main）が存在せず、StabilityMatrixでカテゴリを組み合わせて使用できなかった

**追加機能**:
- `character_main` セクションの自動生成
- `__カテゴリ名__` 形式のワイルドカード参照対応
- StabilityMatrix完全互換のYAML形式

**変更内容**:
1. `gui_app.py`の`generate_yaml()`メソッドを大幅修正
   - `yaml.dump()`から手動YAML生成に変更
   - `character_main`セクションを先頭に追加
   - 2スペースインデント統一
   - ダブルクォート囲み統一
   - セクション順序を規定（character_main → characterface → clothing → poseemotion → backgrounds → characterbody → uncategorized）

**出力例**:
```yaml
character_main:
  - "1girl, solo, __characterface__, __characterbody__, __clothing__, __poseemotion__, __backgrounds__, __uncategorized__"

characterface:
  - "brown hair, hair ornament, hairclip, pink eyes, purple eyes, long hair, short hair, medium hair"
  - "brown hair, hair ornament, blush, bangs, purple eyes, medium hair, long hair, braid, pink eyes, short hair"

clothing:
  - "torn clothes, thighhighs, hairclip, corset, boots, dress, thigh boots, wrist cuffs, torn dress, puffy sleeves"
  ...
```

**ワイルドカード参照の動作**:
- StabilityMatrixでプロンプト生成時、`__characterface__` は `characterface` セクションからランダムに1行選択
- 全カテゴリを組み合わせた完全なプロンプトを自動生成

**変更ファイル**:
- gui_app.py: generate_yaml()メソッドを修正
- README.md: YAML出力例を更新
- 要件定義書_プロンプト分類ツール.md: 2.4節（YAML生成機能）を全面更新
- CLAUDE.md: Phase 4に修正履歴を追記

### 2025-10-26: uncategorizedキーワード登録（ハロウィンNSFW画像由来） ✅

**追加内容**: uncategorizedから分類可能なキーワード83個を登録

**カテゴリ別追加数**:
- clothing: +36キーワード（torn_clothes, witch_hat, corset, thigh_boots, halloween_costume等）
- poseemotion: +17キーワード（spread_pussy, spread_anus, female_masturbation, sex, object_insertion等）
- backgrounds: +14キーワード（halloween, jack-o'-lantern, pumpkin, ghost, spider_web, moon等）
- characterbody: +16キーワード（1girl, 1boy, solo, breasts, nipples, pussy, anus, penis, sweat等）

**変更後の合計**: 1020 → 1103キーワード

**変更ファイル**:
- keyword_database.py: 各カテゴリに新キーワード追加
- README.md: 統計テーブル更新
- CLAUDE.md: 統計情報更新

