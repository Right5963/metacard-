# プロンプト分類・ワイルドカード生成ツール

AIイラスト生成用プロンプトを自動分類し、2つの出力形式を提供するGUIツール。

## 機能概要

### Mode A: YAML生成モード
- 単一txtファイルからプロンプトを読み込み
- 6カテゴリに自動分類
- StabilityMatrix互換のYAML形式で出力

### Mode B: テキスト抽出・並べモード
- 複数txtファイル(フォルダ単位)を一括処理
- 指定カテゴリのみを抽出
- 1ファイル=1行形式で出力
- Stable Diffusion "Prompts from file or textbox" 用

---

## 分類カテゴリ

| カテゴリ | 英語名 | キーワード数 | 内容 |
|---------|--------|------------|------|
| 顔 | characterface | **105** | **髪型**（drill_hair/twin_drills/pointy_hair/spiked_hair/ringlets/hair_up/hair_down/asymmetrical_hair/sidecut等）、**前髪**（blunt_bangs/swept_bangs/parted_bangs/asymmetrical_bangs/hair_over_one_eye/hair_between_eyes等）、**髪の特徴**（hair_flaps/sidelocks/hair_intakes/blunt_ends/floating_hair/widow's_peak等）、目の色、髪色、唇の装飾など |
| 服装 | clothing | **345** | 服、アクセサリー、靴、下着、**水着**（bikini/bikini_skirt/halter_bikini/racing_bikini/tankini/sports_bikini/competition_swimsuit/dress_swimsuit/strapless_swimsuit/high-waisted_swimsuit/polka_dot_swimsuit/striped_swimsuit/swim_cap/sarong/jammers/swim_briefs/swim_trunks/fundoshi/loincloth/wetsuit等）、**水着の状態**（adjusting_swimsuit/swimsuit_aside/bikini_bottom_aside/bikini_top_lift/one-piece_swimsuit_pull/bikini_bottom_only/bikini_top_only/hand_under_swimsuit/impossible_swimsuit/swimsuit_under_clothes/torn_swimsuit等）、**メイド服**（maid_headdress/maid_apron/apron/waist_apron/frilled_apron等）、**職業・職業装束**（miko/nun/priestess/priest/witch/mage/wizard/ninja/samurai/waitress/office_lady/chef/idol/magical_girl/police/soldier/knight/teacher/housewife/princess/flight_attendant等）、**コスチューム**（bunny_girl/playboy_bunny/santa/halloween/vampire/ghost/superhero/kigurumi/halloween_costume等）、**動物着ぐるみ**（bear/cat/cow/dog/panda/rabbit/tiger等）、**制服**（school/military/gym/baseball/basketball/tennis/soccer等）、**特殊装備**（tuxedo/bikini_armor/armored_dress/leotard/pajamas/cyber_fashion等）、**下着**（blue_panties/aqua_panties/bow_panties/lace-trimmed_panties等）、**ドレス**（blue_dress/plaid_dress/frilled_dress等）、**靴下**（white_thighhighs/lace-trimmed_legwear等）、**服の状態・動作**（clothes_lift/skirt_lift/clothing_aside/clothing_pull/unbuttoned/unfastened/open_jacket/torn_clothes/torn_dress/torn_skirt等）、**露出・カットアウト**（off_shoulder/bare_back/backless_outfit/side_slit/hip_vent/pelvic_curtain等）、**着脱状態**（topless/bottomless/underwear_only/no_panties/no_bra/breasts_out等）、**特殊な着衣**（naked_apron/naked_shirt/naked_towel/zettai_ryouiki等）、**ブーツ・靴**（thigh_boots/high_heel_boots/black_footwear等）、**アクセサリー**（detached_collar/neck_ribbon/blue_ribbon/black_ribbon/ribbon/garter_straps/garter_belt/lace_trim/hairclip/jewelry等）、**柄**（plaid/bat_print/animal_print等）、**透け・露出**（see-through/covered_nipples/wet/open_clothes等）など |
| ポーズ・表情 | poseemotion | **601** | 姿勢、動作、**表情バリエーション**（smile/half_smile/light_smile/gloomy_smile/sad_smile/nervous_smile/evil_smile/crazy_smile/grinning_smile/smug/laughing/crazy_laugh/big_laugh/burst_out_laughing/giggling/bored/confused/disdain/disgusted/disappointed/frustrated/determined/excited/exhausted/expressionless/clear_face/glaring/grimace/yawn/drooling/drunk/envy/evil/anguish/gloom/dark_persona/yandere/fangasm/flustered等）、**怒り**（angry/annoyed/rage/scowl/anger_vein等）、**泣き**（crying/tears/sobbing/tearing_up/happy_tears/streaming_tears/wiping_tears/tears_from_one_eye/floating_tears/glowing_tears/crying_with_eyes_open等）、**照れ**（embarrassed/shy/blushing/bashful/blush_stickers/full-face_blush/nose_blush等）、**性的表情**（ahegao/torogao/heart_eyes/cross-eyed/upturned_eyes/crazy_eyes/drunken_eyes等）、**口の表情**（saliva/heavy_breathing/moaning/lip_biting/fang_out等）、**感情・状態**（aroused/horny/in_heat/sexual_arousal/orgasm/fucked_silly/emotionless_sex等）、**アングル・視点・構図**、**戦闘・アクション**、**特殊効果**、**座り方バリエーション**、**頭・髪の動作**、**口の動作・キス**、**手・腕の詳細ポーズ**（holding/hug/grab/hand_on/pointing/covering）、**手のシェイプ・特殊ポーズ**（peace_sign/heart_hands/jojo_pose/gendou_pose等）、**脚・足のポーズ・動作**（spread/crossed/lift/plantar_flexion/dorsiflexion/trampling/spread_pussy/spread_anus/spread_ass等）、**視線方向**（looking_to_the_side等）、**顔・体の視覚効果**（eyes_visible_through_hair/armpit_focus）、**incoming系インタラクション**（incoming_attack/punch/drink/food/gift/fed_by_viewer）、**性的動作**（female_masturbation/sex/vaginal/object_insertion/oral/fellatio/straddling/girl_on_top/cowgirl_position/reverse_cowgirl_position/standing_sex/lifted_by_self/panties_aside等）など |
| 背景 | backgrounds | **87** | 場所、環境、シーン、**建物**（building/house等）、**空・雲**（blue_sky/cloud等）、**ハロウィン**（halloween/jack-o'-lantern/pumpkin/ghost/spider_web/silk/halloween_bucket等）、**天体・空**（moon/full_moon/night_sky等）、**自然**（bare_tree/flower等）、**小道具**（food/candy等）など |
| 体の特徴 | characterbody | **134** | **年齢・性別**（boy/girl/man/woman/child/toddler/teenager/student/old_man/old_woman/mature_female/aged_down/aged_up/age_difference/shota/kemono等）、**人数**（1girl/1boy/solo/solo_focus/hetero等）、**露出状態・裸体**（completely_nude/nude_female/nude_male/topless_female/topless_male/bottomless_female/bottomless_male/clothed_female/clothed_male等）、**露出部位**（bare_arms/bare_shoulders/bare_legs/backboob/sideboob/underboob/pectorals等）、**体の主要部位**（breasts/nipples/pussy/anus/penis/testicles/uvula/long_tongue/dark_tongue等）、**体の状態**（sweat/sweaty/sweatdrop/flying_sweatdrops/sweaty_clothes/sparkling_sweat/wiping_sweat/very_sweaty/spoken_sweatdrop/pussy_juice/shiny/shiny_skin/pubic_hair/female_pubic_hair/male_pubic_hair/erection/ass_visible_through_thighs/skindentation等）、体型、肌の色、身長、**胸部の詳細**（形状・動作・インタラクション・測定）など |
| その他 | uncategorized | - | 分類不能なタグ（censored/mosaic_censoring/dildo/sex_toy/cum/condom/after_sex等） |

**合計**: 1272キーワード

---

## インストール

### 必要環境
- Python 3.7以上
- Windows 10/11（Tkinter対応OS）

### 依存パッケージのインストール
```bash
pip install -r requirements.txt
```

または
```bash
pip install PyYAML
```

---

## 使い方

### 起動方法

#### 方法1: バッチファイルで起動（推奨）
**簡単起動**:
```
起動.bat をダブルクリック
```

**初回セットアップ付き起動**（Python環境チェック・パッケージ自動インストール）:
```
起動（初回セットアップ付き）.bat をダブルクリック
```

#### 方法2: コマンドラインで起動
```bash
python gui_app.py
```

### Mode A: YAML生成モードの使い方

1. **モード選択**: "Mode A: YAML生成モード" を選択
2. **ファイル選択**: 「ファイルを選択」ボタンでtxtファイルを選択
   - **複数ファイル選択可能**: CtrlキーまたはShiftキーを押しながらクリックで複数選択
   - 複数ファイルの場合、全てのファイルから行を統合してYAML生成
3. **実行**: 「実行」ボタンをクリック
4. **確認**: プレビューエリアでYAML内容を確認
5. **保存**:
   - 「クリップボードにコピー」でコピー
   - 「ファイルに保存」で.yamlファイルとして保存

#### 入力ファイル例
```
long hair, blue eyes, smile, school uniform, classroom, large breasts
short hair, red eyes, angry, bikini, beach, small breasts
```

#### 出力YAML例（StabilityMatrix互換ワイルドカード）
```yaml
character_main:
  - "1girl, solo, __characterface__, __characterbody__, __clothing__, __poseemotion__, __backgrounds__, __uncategorized__"

characterface:
  - "long hair, blue eyes, smile"
  - "short hair, red eyes, angry"

clothing:
  - "school uniform"
  - "bikini"

poseemotion:

backgrounds:
  - "classroom"
  - "beach"

characterbody:
  - "large breasts"
  - "small breasts"

uncategorized:

```

**ワイルドカードの使い方:**
- `character_main` セクション: 全カテゴリを組み合わせるテンプレート
- `__characterface__` → `characterface` セクションからランダムに1つ選択
- `__characterbody__` → `characterbody` セクションからランダムに1つ選択
- StabilityMatrixで使用すると、各カテゴリを自動的に組み合わせてプロンプト生成

---

### Mode B: テキスト抽出モードの使い方

1. **モード選択**: "Mode B: テキスト抽出・並べモード" を選択
2. **フォルダ選択**: 「フォルダを選択」ボタンで複数txtファイルが入ったフォルダを選択
3. **カテゴリ選択**: 抽出したいカテゴリにチェック
   - 例: poseemotion のみ
   - 例: clothing + poseemotion
   - 例: 全て選択
4. **実行**: 「テキスト抽出」ボタンをクリック
5. **確認**: プレビューエリアで抽出結果を確認（1ファイル=1行）
6. **保存**:
   - 「クリップボードにコピー」でコピー
   - 「ファイルに保存」で.txtファイルとして保存

#### 入力フォルダ例
```
C:\prompts\
├── image_001.txt
├── image_002.txt
└── image_003.txt
```

#### 各ファイルの内容例
```
# image_001.txt
all fours, breasts, open mouth, blush, cleavage, :d

# image_002.txt
ass, breasts, looking at viewer, blush, looking back, cowboy shot

# image_003.txt
squatting, solo, breasts, looking at viewer, blush, from below
```

#### poseemotion のみ抽出した出力例
```
all fours,open mouth,blush,:d,
looking at viewer,blush,looking back,
squatting,looking at viewer,blush,from below,
```

このテキストをStable Diffusionの「Prompts from file or textbox」に貼り付けると、
3枚の異なるポーズの画像を一気に生成できます。

---

## 出力ファイル命名規則

### YAML生成モード
```
prompts_classified_YYYYMMDD.yaml
例: prompts_classified_20251026.yaml
```

### テキスト抽出モード
```
# 単一カテゴリ
prompts_extracted_poseemotion_20251026.txt

# 複数カテゴリ
prompts_extracted_clothing+poseemotion_20251026.txt

# 全カテゴリ
prompts_extracted_all_20251026.txt
```

---

## よくある質問

### Q1. どのプロンプトがどのカテゴリに分類されるか知りたい
A. `keyword_database.py` に全キーワード辞書が定義されています。

### Q2. 新しいキーワードを追加したい
A. `keyword_database.py` の該当カテゴリのsetに追加してください。

### Q3. StabilityMatrixでワイルドカードとして使える?
A. はい。Mode Aで生成したYAMLファイルをStabilityMatrixのワイルドカードフォルダに配置すれば使えます。

### Q4. 複数のカテゴリを同時に抽出できる?
A. はい。Mode Bでチェックボックスを複数選択することで可能です。

### Q5. 出力ファイルのエンコーディングは?
A. UTF-8です。日本語プロンプトにも対応しています。

---

## トラブルシューティング

### エラー: "ModuleNotFoundError: No module named 'yaml'"
```bash
pip install PyYAML
```

### エラー: "TclError: can't invoke "tk" command"
Tkinterがインストールされていません。Python再インストールでTkinterを有効化してください。

### ファイルが開けない
- ファイルパスに日本語が含まれていないか確認
- ファイルのエンコーディングがUTF-8か確認

---

## ファイル構成

```
C:\metacard\
├── README.md                        # このファイル
├── CLAUDE.md                        # プロジェクト記憶
├── 要件定義書_プロンプト分類ツール.md  # 要件定義
├── gui_app.py                       # GUIアプリ（メイン）
├── keyword_database.py              # キーワード辞書
├── prompt_classifier.py             # 分類エンジン
├── text_extractor.py                # テキスト抽出
├── requirements.txt                 # 依存パッケージ
├── test_phase12.py                  # Phase 1,2 テスト
├── input/                           # 入力ファイル置き場（任意）
└── output/                          # 出力ファイル置き場（自動作成）
```

---

## ライセンス

個人・商用利用可能

---

## 更新履歴

### 2025-10-26
- Phase 4: GUI実装完了
  - 2モード対応
  - カテゴリ複数選択
  - クリップボードコピー
  - ファイル保存

### 2025-10-26 (Phase 3)
- テキスト抽出機能実装
- 複数ファイル一括処理対応

### 2025-10-26 (Phase 1-2)
- プロジェクト開始
- キーワード辞書作成
- 分類エンジン実装
