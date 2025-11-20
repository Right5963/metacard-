# ワイルドカードYAML作成ガイドライン

## 基本概念

ワイルドカードYAMLファイルは、AIイラスト生成のためのテンプレートとして機能します。成功したイラストのタグを分析し、効率的に類似イラストを生成するための構造化されたデータです。

## ファイル命名規則

- 必ず日付をYYYYMMDD形式で含めること: `wildcards_20250430.yaml`
- プロジェクトのルートディレクトリに保存すること

## タグ分類ルール

### 1. セット形式の採用

タグはセット形式で分類します。セットとは、同時に使われることが多い関連タグのグループです。

### 2. 基本カテゴリ

タグは以下のカテゴリに分類します：

- **character_main**: キャラクター基本設定（1girl/2girls/soloなど）
- **characterface**: 顔、髪型、目などの特徴
- **characterbody**: 体の特徴、体のパーツなど
- **clothing**: 衣装、服装関連
- **poseemotion**: ポーズと感情表現
- **angle**: 視点、アングル
- **accessories**: 装飾品、アクセサリー
- **backgrounds**: 背景設定
- **style**: 画風、スタイル
- **quality**: 画質、解像度など
- **sexual**: 成人向けコンテンツ（必要な場合）

### 3. キャラクター判定ルール

- 目の色が複数ある場合（blue eyes + purple eyesなど）: `2girls`を使用
- 髪の色が複数ある場合（blonde hair + black hairなど）: `2girls`を使用
- 明らかに複数キャラクターの特徴がある場合: `2girls`以上を使用

### 4. セット形式の実装

```yaml
character_main:
  - "セット1: 1girl, solo"
  - "セット2: 2girls, multiple girls"

characterface:
  - "セット1: blonde hair, ponytail, long hair, blue eyes"
  - "セット2: black hair, short hair, purple eyes, glasses"

# 他のカテゴリも同様に
```

### 5. 共起分析の活用

タグの共起性（一緒に出現する頻度）を分析し、関連性の高いタグをグループ化してセットを形成します。

### 6. 除外すべきタグ

以下のタグは除外します：
- sample, watermark, english text, artist name
- cover, artist logo, web address, doujin cover
- content rating, novel cover, copyright name
- company name, logo, chinese text, character name
- character profile, fake screenshot, stats
- pixelated, mosaic censoring, censored, copyright notice

## YAML構造

```yaml
character_main:
  - "セット1: 1girl,__characterface__,__characterbody__,__clothing__,__poseemotion__,__angle__,__backgrounds__"
  - "セット2: 2girls,__characterface__,__characterbody__,__clothing__,__poseemotion__,__angle__,__backgrounds__"

characterface:
  # 顔と髪の特徴に関するセット
  - "セット1: blonde hair, ponytail, long hair, blue eyes"

characterbody:
  # 体の特徴に関するセット
  - "セット1: breasts, ass, large breasts, thighs"

# 以下同様に各カテゴリのセットを定義
```

## 実装手順

1. すべてのタグファイルを収集
2. 各タグをカテゴリに分類
3. カテゴリ内でタグの共起分析を実行
4. 共起分析に基づいてタグセットを形成
5. 最終的なYAML構造を生成
6. 日付形式の命名規則でYAMLファイルを保存

## 除外タグリスト

```
sample
watermark
english text
artist name
cover
artist logo
web address
doujin cover
content rating
novel cover
copyright name
company name
logo
chinese text
character name
character profile
fake screenshot
stats
pixelated
mosaic censoring
censored
copyright notice
```
