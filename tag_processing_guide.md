# タグ処理とワイルドカードYAML作成ガイド

## 概要
このガイドでは、テキストファイルからタグを抽出し、カテゴリ別に分類してワイルドカードYAMLを作成する方法について説明します。

## 基本手順

1. テキストファイル（.txt）からタグを読み込む
2. タグをカテゴリ別に分類する
3. 分類されたタグを使用してワイルドカードYAMLを生成する

## タグの分類カテゴリ

タグは以下のカテゴリに分類されます：

- **character_main**: 主要キャラクター属性（1girl, solo など）
- **characterface**: 顔の特徴（hair, eyes など）
- **characterbody**: 体の特徴（breasts, legs など）
- **clothing**: 衣装関連（swimsuit, dress など）
- **poseemotion**: ポーズと感情（standing, smile など）
- **angle**: 視点・アングル（looking at viewer など）
- **backgrounds**: 背景（outdoors, sky など）
- **style**: スタイル（glitch, sketch など）
- **sexual**: 性的内容（関連タグ）
- **uncategorized**: 分類されないその他のタグ

## ワイルドカードYAML形式

各カテゴリのタグは次のように表示されます：

```yaml
character_main:
  - "1girl, solo, __characterface__, __characterbody__, __clothing__, __poseemotion__, __angle__, __backgrounds__, __style__"

characterface:
  - "short hair, medium hair, long hair, bob cut, brown hair, light brown hair, blonde hair, grey hair, black hair, blue eyes, brown eyes, black eyes, grey eyes, swept bangs, hair between eyes, sidelocks, eyebrows hidden by hair, empty eyes, hair behind ear"
  - "black hair, brown hair, blue eyes, black eyes, brown eyes, short hair, medium hair, long hair, ponytail, high ponytail, sidelocks, blunt bangs, straight hair, hair over shoulder"
  - "long hair, very long hair, straight hair, ponytail, blonde hair, brown eyes, green eyes, yellow eyes, hair between eyes, sidelocks, animal ears, hair ornament"

# 他のカテゴリも同様
```

## 実装例

```python
def categorize_tags(tags):
    """タグをカテゴリ別に分類"""
    categorized = {
        "character_main": [],
        "characterface": [],
        "characterbody": [],
        "clothing": [],
        "poseemotion": [],
        "angle": [],
        "backgrounds": [],
        "style": [],
        "sexual": [],
        "uncategorized": []
    }

    for tag in tags:
        tag_lower = tag.lower()

        # キャラクター主要属性
        if tag in ["1girl", "solo", "girl", "female", "1boy", "male", "woman", "man"]:
            categorized["character_main"].append(tag)
            continue

        # 顔の特徴
        if any(keyword in tag_lower for keyword in CATEGORIES["characterface"]):
            categorized["characterface"].append(tag)
            continue

        # 他のカテゴリの判定も同様に続く...

        # 上記のどれにも当てはまらない場合
        categorized["uncategorized"].append(tag)

    # 空のカテゴリを削除
    return {k: v for k, v in categorized.items() if v}
```

## YAMLファイル保存形式

```python
def save_yaml(yaml_structure, output_path):
    """YAMLファイルに保存（セクション間に空行を挿入）"""
    with open(output_path, 'w', encoding='utf-8') as f:
        for i, (key, values) in enumerate(yaml_structure.items()):
            # キーの書き出し
            f.write(f"{key}:\n")

            # 値の書き出し
            for value in values:
                # 値はダブルクォートで囲む
                f.write(f'  - "{value}"\n')

            # セクション間に空行を挿入（最後のセクション以外）
            if i < len(yaml_structure) - 1:
                f.write('\n')
```

## 注意点

1. タグは原文のまま保持し、改変しないようにする
2. 各テキストファイルごとのタグセットを保持し、不必要にマージしない
3. タグはカンマ区切りでYAMLに出力する
4. 出力ファイルには日付を含める（YYYYMMDD形式）
5. カテゴリ間に空行を入れて可読性を高める

## 使用例

3つのテキストファイルを処理する場合：

1. 各ファイルからタグを読み込む
2. 各ファイルのタグをカテゴリ別に分類
3. ファイルごとのYAML構造を作成
4. 最終的なワイルドカードYAMLファイルに保存

タグデータを扱う際は、元のデータを尊重し、明示的な指示なしに変更や削除を行わないよう注意してください。
