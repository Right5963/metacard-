@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo ================================================
echo   プロンプト分類ツール 起動スクリプト
echo ================================================
echo.

REM Pythonインストール確認
python --version > nul 2>&1
if errorlevel 1 (
    echo [エラー] Pythonがインストールされていません
    echo.
    echo Pythonをインストールしてください:
    echo https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

echo [確認] Python インストール済み
python --version
echo.

REM 依存パッケージ確認
if not exist "requirements.txt" (
    echo [警告] requirements.txt が見つかりません
    echo.
) else (
    echo [確認] 依存パッケージをインストール中...
    pip install -q -r requirements.txt
    if errorlevel 1 (
        echo [警告] パッケージインストールに失敗しました
        echo 手動でインストールしてください: pip install -r requirements.txt
        echo.
    ) else (
        echo [完了] 依存パッケージ インストール完了
        echo.
    )
)

REM GUI起動
echo ================================================
echo   アプリケーションを起動します...
echo ================================================
echo.

python gui_app.py

if errorlevel 1 (
    echo.
    echo ================================================
    echo   エラーが発生しました
    echo ================================================
    echo.
    echo トラブルシューティング:
    echo 1. Python がインストールされているか確認
    echo 2. pip install -r requirements.txt を実行
    echo 3. gui_app.py が存在するか確認
    echo.
    pause
)
