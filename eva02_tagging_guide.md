# EVA02 タグ付けガイドライン

## 概要
wd-EVA02-Large-v3モデルは、画像のより詳細なタグ付けを可能にする高性能なタグ付けモデルです。このガイドではタグの分類カテゴリとタグ付けのワークフローについて説明します。

## タグ分類カテゴリ

タグは以下のカテゴリに分類されます：

1. **女性の顔**
   - 髪型: `long_hair`, `short_hair`, `straight_hair`, `curly_hair`, `wavy_hair`, `ponytail`, `twin_tails`, `braid`
   - 髪色: `blonde_hair`, `silver_hair`, `white_hair`, `brown_hair`, `black_hair`, `blue_hair`, `pink_hair`, `red_hair`, `purple_hair`, `green_hair`
   - 目の色: `blue_eyes`, `red_eyes`, `brown_eyes`, `green_eyes`, `purple_eyes`, `yellow_eyes`, `pink_eyes`, `black_eyes`, `aqua_eyes`, `heterochromia`
   - その他の顔特徴: `small_face`, `beautiful_face`, `cute_face`, `freckles`, `mole`, `glasses`, `eyepatch`

2. **体の特徴**
   - 体型: `small_breasts`, `medium_breasts`, `large_breasts`, `huge_breasts`, `petite`, `tall`, `short`, `curvy`, `slender`
   - 年齢区分: `loli`, `child`, `teenage`, `mature`, `milf`
   - 肌の色: `pale_skin`, `dark_skin`, `tanned`, `white_skin`
   - その他: `tattoo`, `scar`, `birthmark`

3. **服装**
   - 上着: `shirt`, `blouse`, `t-shirt`, `sweater`, `jacket`, `cardigan`, `coat`, `tank_top`, `blazer`
   - 下着: `panties`, `bra`, `lingerie`, `underwear`, `bikini`, `swimsuit`, `thong`
   - 下半身: `skirt`, `pants`, `jeans`, `shorts`, `leggings`, `stockings`, `thighhighs`, `pantyhose`
   - 全身: `dress`, `uniform`, `school_uniform`, `sailor_uniform`, `suit`, `kimono`, `yukata`, `negligee`, `naked`, `nude`, `topless`
   - 履物: `shoes`, `high_heels`, `boots`, `sandals`, `barefoot`
   - アクセサリー: `hat`, `ribbon`, `hairpin`, `necklace`, `earrings`, `bracelet`, `ring`, `tiara`, `crown`

4. **ポーズ**
   - 基本: `standing`, `sitting`, `lying`, `kneeling`, `squatting`, `leaning`
   - 手: `hand_on_hip`, `hand_up`, `hands_clasped`, `finger_pointing`, `v`, `peace_sign`, `thumbs_up`
   - 体: `arms_behind_back`, `arms_crossed`, `bent_over`, `on_back`, `on_side`, `spread_arms`, `spread_legs`
   - 複合: `fighting_stance`, `running`, `walking`, `jumping`, `dancing`

5. **感情**
   - 表情: `smile`, `grin`, `laughing`, `serious`, `angry`, `sad`, `crying`, `embarrassed`, `surprised`, `scared`, `flustered`, `expressionless`
   - 口: `open_mouth`, `closed_mouth`, `parted_lips`, `pout`, `licking_lips`
   - 目: `wide_eyes`, `half-closed_eyes`, `closed_eyes`, `wink`, `tears`, `heart-shaped_pupils`
   - 他: `blush`, `nose_blush`, `sweat`, `nosebleed`

6. **背景**
   - 位置: `indoors`, `outdoors`, `bathroom`, `bedroom`, `kitchen`, `classroom`, `office`, `beach`, `forest`, `city`, `park`
   - 時間帯: `day`, `night`, `sunset`, `sunrise`
   - 天候: `rain`, `snow`, `cloudy`, `sunny`
   - 小物: `bed`, `chair`, `table`, `desk`, `couch`, `window`, `door`

7. **アングル**
   - 視点: `from_above`, `from_below`, `from_side`, `from_behind`, `from_front`
   - 距離: `close-up`, `wide_shot`, `medium_shot`
   - 焦点: `looking_at_viewer`, `looking_away`, `looking_back`, `looking_up`, `looking_down`
   - カメラ: `dutch_angle`, `fisheye`, `depth_of_field`, `bokeh`

## タグ付けワークフロー

1. wd-EVA02-Large-v3モデルを使用して画像にタグを付ける
2. タグを上記のカテゴリに分類する
3. 信頼度（確率）の高いタグを優先的に使用する
4. 各カテゴリから少なくとも1つのタグを含めるようにする
5. Stable Diffusionプロンプトに適したフォーマットにタグを整形する

## 実装方法

```python
# EVA02タグ付けスクリプトの例
python eva02_tagger.py --dir "./downloaded_images" --out "./tagged_results_categorized" --categorize True
```

## 生成された分類結果の例

```
# 元のタグ付け結果
1girl, 0.950000
solo, 0.930000
long_hair, 0.870000
blue_eyes, 0.830000
blonde_hair, 0.770000
smile, 0.720000
school_uniform, 0.680000
skirt, 0.650000
thighhighs, 0.610000
looking_at_viewer, 0.580000

# カテゴリ分類後
女性の顔:
  - 髪型: long_hair, 0.870000
  - 髪色: blonde_hair, 0.770000
  - 目の色: blue_eyes, 0.830000
体の特徴:
  - 不明
服装:
  - school_uniform, 0.680000
  - skirt, 0.650000
  - thighhighs, 0.610000
ポーズ:
  - 不明
感情:
  - smile, 0.720000
背景:
  - 不明
アングル:
  - looking_at_viewer, 0.580000
その他:
  - 1girl, 0.950000
  - solo, 0.930000
```

このガイドラインに従って、すべての画像に対して一貫したタグ付けと分類を行うことで、Stable Diffusionでの画像生成に役立つプロンプトを作成できます。
