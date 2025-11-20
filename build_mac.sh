#!/bin/bash

# エラーが発生したら停止
set -e

echo "===== Prompt Classifier v3 Mac Build Script ====="

# 1. 環境チェック
if ! command -v python3 &> /dev/null; then
    echo "エラー: python3 が見つかりません。インストールしてください。"
    exit 1
fi

# 2. 仮想環境の作成と有効化
echo "-> 仮想環境を作成中..."
if [ -d ".venv_mac" ]; then
    echo "  既存の仮想環境を使用します"
else
    python3 -m venv .venv_mac
fi
source .venv_mac/bin/activate

# 3. 依存パッケージのインストール
echo "-> 依存パッケージをインストール中..."
pip install --upgrade pip
pip install -r requirements_mac.txt

# 4. 古いビルドのクリーンアップ
echo "-> クリーンアップ中..."
rm -rf build dist *.spec

# 5. PyInstallerでビルド
echo "-> アプリケーションをビルド中..."
# --windowed: コンソール画面を出さない
# --icon: アイコンがあれば指定（今回はなし）
# --noconfirm: 上書き確認なし
# --clean: キャッシュクリア
# --target-arch universal2: Intel/Apple Silicon両対応
pyinstaller --noconfirm --clean --windowed --name "Prompt Classifier v3" --target-arch universal2 gui_app.py

# 6. サンプルファイルのコピー
echo "-> サンプルファイルをコピー中..."
if [ -d "sample_input" ]; then
    cp -r sample_input "dist/Prompt Classifier v3.app/Contents/Resources/"
    # ユーザーがアクセスしやすいようにZIPのルートにも配置するために準備
    mkdir -p dist/sample_input
    cp -r sample_input/* dist/sample_input/
fi

# 7. 配布用ZIPの作成
echo "-> 配布用ZIPを作成中..."
cd dist
zip -r "../Prompt_Classifier_v3_macOS.zip" "Prompt Classifier v3.app" "sample_input"

echo "==== ビルド完了 ====="
echo "生成物: Prompt_Classifier_v3_macOS.zip"
