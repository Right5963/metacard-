# クイックスタートガイド

## 1. インストール（初回のみ）

```bash
# 依存パッケージをインストール
pip install -r requirements.txt
```

---

## 2. GUI起動

```bash
python gui_app.py
```

---

## 3. 使い方

### 📁 Mode A: YAML生成（ワイルドカード作成）

1. **モード選択**: "Mode A: YAML生成モード" を選択
2. **ファイル選択**: プロンプトtxtファイルを選択
3. **カテゴリ選択**: 必要なカテゴリにチェック（または「全て選択」）
4. **実行**: 「YAML生成」ボタンをクリック
5. **保存**: 「ファイルに保存」で.yamlファイル保存

**用途**: StabilityMatrixのワイルドカード作成

---

### 📝 Mode B: テキスト抽出（プロンプト一括生成用）

1. **モード選択**: "Mode B: テキスト抽出・並べモード" を選択
2. **フォルダ選択**: 複数のプロンプトtxtファイルが入ったフォルダを選択
3. **カテゴリ選択**: 抽出したいカテゴリにチェック
   - 例: **poseemotion** のみ → 異なるポーズだけ抽出
   - 例: **clothing + poseemotion** → 服装とポーズを抽出
4. **実行**: 「テキスト抽出」ボタンをクリック
5. **保存**: 「ファイルに保存」または「クリップボードにコピー」

**出力形式**: 1ファイル=1行
```
all fours,open mouth,blush,:d,
looking at viewer,blush,looking back,cowboy shot,
squatting,looking at viewer,from below,
```

**用途**: Stable Diffusion "Prompts from file or textbox" に貼り付けて一括生成

---

## 4. カテゴリ分類の種類

| カテゴリ | 内容例 |
|---------|--------|
| 顔 (characterface) | long hair, blue eyes, smile |
| 服装 (clothing) | school uniform, bikini, dress |
| ポーズ・表情 (poseemotion) | all fours, looking at viewer, blush |
| 背景 (backgrounds) | classroom, beach, garden |
| 体の特徴 (characterbody) | large breasts, tall, tan skin |
| その他 (uncategorized) | 未分類タグ |

---

## 5. よくある使い方

### 使い方1: 異なるポーズで同じキャラを大量生成

1. 複数のプロンプトファイルを用意（各ファイル=1ポーズ）
2. Mode Bで **poseemotion** のみ抽出
3. 抽出結果をStable Diffusionに貼り付け
4. 一括生成！

### 使い方2: ワイルドカードを作成してランダム生成

1. プロンプトファイルを用意
2. Mode AでYAML生成
3. StabilityMatrixのワイルドカードフォルダに配置
4. `{wildcard_name}` で使用

---

## 6. トラブルシューティング

### エラー: "ModuleNotFoundError: No module named 'yaml'"
```bash
pip install PyYAML
```

### GUIが起動しない
- Pythonのバージョン確認: `python --version`（3.7以上必要）
- Tkinterインストール確認: `python -c "import tkinter"`

---

## 7. ファイル構成

```
C:\metacard\
├── gui_app.py           # ← これを実行
├── keyword_database.py
├── prompt_classifier.py
├── text_extractor.py
├── requirements.txt
├── README.md            # 詳細マニュアル
└── output/              # 出力先（自動作成）
```

---

## 📚 詳細マニュアル

詳しい使い方は **README.md** を参照してください。

---

## ✅ 動作確認

```bash
# テストスクリプト実行
python test_gui.py
```

全テストが [OK] になればOK！
