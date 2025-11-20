# macOS版 ビルド手順書

このドキュメントでは、Mac環境で「Prompt Classifier v3」をビルドする手順を説明します。
Windows環境ではMac用アプリケーション（.app）を作成できないため、GitHub Actionsを使用するか、Mac環境での作業が必要です。

## 前提条件

- **macOS**: 11 Big Sur 以降推奨
- **Python**: 3.10 以降
- **インターネット接続**: ライブラリのダウンロードに必要

## 方法1: GitHub Actions を使う（推奨・Mac不要）

Macをお持ちでない場合、GitHubにコードをアップロードするだけで自動的にビルドできます。

### 手順

1. **GitHubリポジトリを作成**
   - GitHubで新しいリポジトリを作成します。
   - このフォルダの中身をすべてアップロード（プッシュ）します。

2. **Actions タブを確認**
   - GitHubのリポジトリページで「Actions」タブをクリックします。
   - 「Build Mac App」というワークフローが自動的に実行されているはずです（もし動いていなければ、手動で実行も可能です）。

3. **成果物をダウンロード**
   - 実行が完了（緑色のチェックマーク）したら、その実行ログをクリックします。
   - ページ下部の「Artifacts」セクションにある **Mac-App-Build** をクリックしてダウンロードします。
   - ダウンロードしたZIPファイルを解凍すると、`Prompt_Classifier_v3_macOS.zip` が入っています。これを開くとアプリ本体とサンプルファイルが含まれています。

---

## 方法2: Mac実機でビルドする

Macをお持ちの場合は、以下の手順で手動ビルドも可能です。

### 前提条件

Windows環境から以下のファイルをMacにコピーしてください。

- `gui_app.py`
- `prompt_classifier.py`
- `text_extractor.py`
- `keyword_database.py`
- `requirements_mac.txt`
- `build_mac.sh` (このファイル)
- `sample_input/` (フォルダごと)

### 2. ビルドスクリプトの実行

ターミナルを開き、ファイルがあるディレクトリに移動して以下のコマンドを実行します。

```bash
# 実行権限を付与
chmod +x build_mac.sh

# スクリプトを実行
./build_mac.sh
```

スクリプトは自動的に以下の処理を行います：
1. Python仮想環境の作成 (`.venv_mac`)
2. 必要なライブラリのインストール (`requirements_mac.txt`)
3. アプリケーションのビルド (`Prompt Classifier v3.app`の生成)
4. 配布用ZIPファイルの作成

### 3. 生成物の確認

処理が完了すると、同じディレクトリに以下のファイルが生成されます。

- **Prompt_Classifier_v3_macOS.zip**

このZIPファイルが配布用のパッケージです。

## 手動ビルド（スクリプトを使わない場合）

もしスクリプトが動かない場合は、以下の手順で手動ビルドを行ってください。

```bash
# 1. 仮想環境作成
python3 -m venv .venv
source .venv/bin/activate

# 2. ライブラリインストール
pip install -r requirements_mac.txt

# 3. ビルド実行
# --target-arch universal2 は Intel/Apple Silicon 両対応にするためのオプションです
pyinstaller --noconfirm --clean --windowed --name "Prompt Classifier v3" --target-arch universal2 gui_app.py

# 4. 動作確認
open "dist/Prompt Classifier v3.app"
```

## トラブルシューティング

### "command not found: python3" エラー
Pythonがインストールされていません。公式サイト (python.org) からインストーラーをダウンロードしてインストールしてください。

### ビルド中にエラーが出る場合
エラーメッセージを確認してください。よくある原因は以下の通りです：
- ネットワーク接続がない（pip install失敗）
- 書き込み権限がない（sudoが必要な場所にファイルを置いているなど）

### アプリが起動しない
ターミナルから直接実行ファイルを実行してエラーログを確認してください：
```bash
./dist/Prompt\ Classifier\ v3.app/Contents/MacOS/Prompt\ Classifier\ v3
```
