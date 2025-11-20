# ========================================
# AI物販オートメーションワークフロー
# Created by: AI Assistant
# ========================================

param(
    [Parameter(Mandatory=$false)]
    [string]$SellerID = "",

    [Parameter(Mandatory=$false)]
    [string]$OutputFolder = ".\downloaded_images",

    [Parameter(Mandatory=$false)]
    [string]$TaggerOutputFolder = ".\tagged_results",

    [Parameter(Mandatory=$false)]
    [string]$YamlOutputPath = ".\result.yaml"
)

# 文字エンコーディング設定
$PSDefaultParameterValues['*:Encoding'] = 'utf8'
$env:PYTHONIOENCODING = "utf-8"
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null  # UTF-8コードページを設定

# 設定パス（実際のインストールパスに合わせて変更）
$AUTOBOORU_PATH = ".\Auto Booru 0413\Auto Booru"
$AUTOBOORU_X_PATH = ".\Autobooru_X\Autobooru_X"
$TXT_MATOME_PATH = ".\TXT MATOME 0413\TXT MATOME\txt matome"
$WD14_TAGGER_PATH = ".\WD14_Tagger" # WD14 Taggerのパスは確認が必要

# パスが存在するか確認
function Test-ToolPath {
    param (
        [string]$Path,
        [string]$ToolName
    )

    if (-not (Test-Path $Path)) {
        Write-Host "$ToolName のパスが見つかりません: $Path" -ForegroundColor Red
        Write-Host "設定メニューでパスを正しく設定してください。" -ForegroundColor Yellow
        return $false
    }
    return $true
}

# ユーザーインターフェース関数
function Show-Menu {
    Clear-Host
    Write-Host "===== AI物販オートメーションワークフロー =====" -ForegroundColor Cyan
    Write-Host "1: ヤフオクセラー画像収集 → 解析 → YAML変換" -ForegroundColor Green
    Write-Host "2: X(Twitter)ターゲット画像収集 → 解析 → YAML変換" -ForegroundColor Green
    Write-Host "3: すでにダウンロードした画像の解析 → YAML変換" -ForegroundColor Green
    Write-Host "4: 設定" -ForegroundColor Yellow
    Write-Host "0: 終了" -ForegroundColor Red
    Write-Host "=======================================" -ForegroundColor Cyan

    $choice = Read-Host "選択してください"
    return $choice
}

# Autobooruを実行する関数
function Run-Autobooru {
    param (
        [string]$sellerID
    )

    if ([string]::IsNullOrEmpty($sellerID)) {
        $sellerID = Read-Host "ヤフオクセラーIDを入力してください"
    }

    # IDから不要な空白を除去
    $sellerID = $sellerID.Trim()

    Write-Host "Autobooruを実行中... セラーID: $sellerID" -ForegroundColor Cyan

    # ツールパスの確認
    if (-not (Test-ToolPath -Path $AUTOBOORU_PATH -ToolName "Autobooru")) {
        return $false
    }

    # 実際のAutobooruコマンド
    Set-Location $AUTOBOORU_PATH
    # UTF-8エンコーディングを明示的に指定
    $env:PYTHONIOENCODING = "utf-8"

    # main.pyが存在することを確認
    if (-not (Test-Path "main.py")) {
        Write-Host "main.pyが見つかりません。パスを確認してください: $AUTOBOORU_PATH" -ForegroundColor Red
        return $false
    }

    # セラーURLを構築
    $sellerUrl = "https://auctions.yahoo.co.jp/seller/$sellerID"
    Write-Host "セラーURL: $sellerUrl" -ForegroundColor Yellow

    # 実行 - 正しい引数形式で実行
    $absoluteOutputPath = [System.IO.Path]::GetFullPath($OutputFolder)
    Write-Host "出力先: $absoluteOutputPath" -ForegroundColor Yellow

    # エラーが出ないように実行
    try {
        # 引数の形式を調整
        & python main.py "--output" "$absoluteOutputPath" "$sellerUrl"

        if ($LASTEXITCODE -eq 0) {
            Write-Host "画像ダウンロード完了！" -ForegroundColor Green
            return $true
        } else {
            Write-Host "画像ダウンロード中にエラーが発生しました。終了コード: $LASTEXITCODE" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "エラーが発生しました: $_" -ForegroundColor Red
        return $false
    }
}

# Autobooru_Xを実行する関数
function Run-Autobooru-X {
    param (
        [string]$targetID
    )

    if ([string]::IsNullOrEmpty($targetID)) {
        $targetID = Read-Host "X(Twitter)のターゲットIDを入力してください"
    }

    # IDから不要な空白を除去
    $targetID = $targetID.Trim()

    Write-Host "Autobooru_Xを実行中... ターゲットID: $targetID" -ForegroundColor Cyan

    # ツールパスの確認
    if (-not (Test-ToolPath -Path $AUTOBOORU_X_PATH -ToolName "Autobooru_X")) {
        return $false
    }

    # 実際のAutobooru_Xコマンド
    Set-Location $AUTOBOORU_X_PATH
    # UTF-8エンコーディングを明示的に指定
    $env:PYTHONIOENCODING = "utf-8"

    # main.pyが存在することを確認
    if (-not (Test-Path "main.py")) {
        Write-Host "main.pyが見つかりません。パスを確認してください: $AUTOBOORU_X_PATH" -ForegroundColor Red
        return $false
    }

    # 実行
    & python main.py --target "$targetID" --output "$OutputFolder"

    if ($LASTEXITCODE -eq 0) {
        Write-Host "X画像ダウンロード完了！" -ForegroundColor Green
        return $true
    } else {
        Write-Host "X画像ダウンロード中にエラーが発生しました。" -ForegroundColor Red
        return $false
    }
}

# WD14 Taggerを実行する関数
function Run-WD14-Tagger {
    param (
        [string]$imageFolder
    )

    Write-Host "WD14 Taggerで画像解析中..." -ForegroundColor Cyan

    # ツールパスの確認
    if (-not (Test-ToolPath -Path $WD14_TAGGER_PATH -ToolName "WD14 Tagger")) {
        Write-Host "WD14 Taggerが見つかりません。インストール後、設定メニューで正しいパスを設定してください。" -ForegroundColor Red
        return $false
    }

    # 実際のWD14 Taggerコマンド
    Set-Location $WD14_TAGGER_PATH
    # UTF-8エンコーディングを明示的に指定
    $env:PYTHONIOENCODING = "utf-8"

    # メインのpyファイルを探す
    $pythonScript = Get-ChildItem -Filter "*.py" | Where-Object { $_.Name -like "*tag*.py" -or $_.Name -eq "main.py" } | Select-Object -First 1

    if ($null -eq $pythonScript) {
        Write-Host "WD14 Taggerの実行ファイル（.py）が見つかりません。" -ForegroundColor Red
        return $false
    }

    & python $pythonScript.Name --dir "$imageFolder" --out "$TaggerOutputFolder"

    if ($LASTEXITCODE -eq 0) {
        Write-Host "画像タグ付け完了！" -ForegroundColor Green
        return $true
    } else {
        Write-Host "画像タグ付け中にエラーが発生しました。" -ForegroundColor Red
        return $false
    }
}

# TXT MATOMEを実行する関数
function Run-TXT-MATOME {
    param (
        [string]$txtFolder
    )

    Write-Host "TXT MATOMEでYAML変換中..." -ForegroundColor Cyan

    # ツールパスの確認
    if (-not (Test-ToolPath -Path $TXT_MATOME_PATH -ToolName "TXT MATOME")) {
        return $false
    }

    # 実際のTXT MATOMEコマンド
    Set-Location $TXT_MATOME_PATH
    # UTF-8エンコーディングを明示的に指定
    $env:PYTHONIOENCODING = "utf-8"

    # prompt_converter.pyが存在することを確認
    if (-not (Test-Path "prompt_converter.py")) {
        Write-Host "prompt_converter.pyが見つかりません。パスを確認してください: $TXT_MATOME_PATH" -ForegroundColor Red
        return $false
    }

    # 実行
    & python prompt_converter.py --input "$txtFolder" --output "$YamlOutputPath"

    if ($LASTEXITCODE -eq 0) {
        Write-Host "YAML変換完了！ファイル: $YamlOutputPath" -ForegroundColor Green
        return $true
    } else {
        Write-Host "YAML変換中にエラーが発生しました。" -ForegroundColor Red
        return $false
    }
}

# ヤフオクワークフロー全体を実行
function Run-Yahoo-Auction-Workflow {
    param (
        [string]$sellerID
    )

    # ステップ1: Autobooruで画像ダウンロード
    $result = Run-Autobooru -sellerID $sellerID
    if (-not $result) { return }

    # ステップ2: WD14 Taggerで画像解析
    $result = Run-WD14-Tagger -imageFolder $OutputFolder
    if (-not $result) { return }

    # ステップ3: TXT MATOMEでYAML変換
    $result = Run-TXT-MATOME -txtFolder $TaggerOutputFolder
    if (-not $result) { return }

    Write-Host "ワークフロー完了！以下のYAMLファイルが生成されました:" -ForegroundColor Cyan
    Write-Host $YamlOutputPath -ForegroundColor Yellow
    Start-Process "explorer.exe" -ArgumentList "/select,$YamlOutputPath"
}

# X(Twitter)ワークフロー全体を実行
function Run-X-Workflow {
    param (
        [string]$targetID
    )

    # ステップ1: Autobooru_Xで画像ダウンロード
    $result = Run-Autobooru-X -targetID $targetID
    if (-not $result) { return }

    # ステップ2: WD14 Taggerで画像解析
    $result = Run-WD14-Tagger -imageFolder $OutputFolder
    if (-not $result) { return }

    # ステップ3: TXT MATOMEでYAML変換
    $result = Run-TXT-MATOME -txtFolder $TaggerOutputFolder
    if (-not $result) { return }

    Write-Host "ワークフロー完了！以下のYAMLファイルが生成されました:" -ForegroundColor Cyan
    Write-Host $YamlOutputPath -ForegroundColor Yellow
    Start-Process "explorer.exe" -ArgumentList "/select,$YamlOutputPath"
}

# 設定変更関数
function Show-Settings {
    Write-Host "===== 設定 =====" -ForegroundColor Yellow
    Write-Host "1: ツールパス設定" -ForegroundColor Green
    Write-Host "2: 出力フォルダ設定" -ForegroundColor Green
    Write-Host "3: WD14 Taggerのインストール確認" -ForegroundColor Green
    Write-Host "0: 戻る" -ForegroundColor Red

    $choice = Read-Host "選択してください"

    switch ($choice) {
        "1" {
            $newPath = Read-Host "Autobooruのパスを入力してください [$AUTOBOORU_PATH]"
            if ($newPath) { $AUTOBOORU_PATH = $newPath }

            $newPath = Read-Host "Autobooru_Xのパスを入力してください [$AUTOBOORU_X_PATH]"
            if ($newPath) { $AUTOBOORU_X_PATH = $newPath }

            $newPath = Read-Host "WD14 Taggerのパスを入力してください [$WD14_TAGGER_PATH]"
            if ($newPath) { $WD14_TAGGER_PATH = $newPath }

            $newPath = Read-Host "TXT MATOMEのパスを入力してください [$TXT_MATOME_PATH]"
            if ($newPath) { $TXT_MATOME_PATH = $newPath }
        }
        "2" {
            $newPath = Read-Host "ダウンロード画像の出力フォルダを入力してください [$OutputFolder]"
            if ($newPath) { $OutputFolder = $newPath }

            $newPath = Read-Host "タグ付け結果の出力フォルダを入力してください [$TaggerOutputFolder]"
            if ($newPath) { $TaggerOutputFolder = $newPath }

            $newPath = Read-Host "YAML出力パスを入力してください [$YamlOutputPath]"
            if ($newPath) { $YamlOutputPath = $newPath }
        }
        "3" {
            Check-WD14-Tagger-Installation
        }
    }
}

# WD14 Taggerのインストール確認
function Check-WD14-Tagger-Installation {
    Write-Host "WD14 Taggerのインストール状況を確認中..." -ForegroundColor Cyan

    if (-not (Test-Path $WD14_TAGGER_PATH)) {
        Write-Host "WD14 Taggerのパスが見つかりません: $WD14_TAGGER_PATH" -ForegroundColor Red
        Write-Host "WD14 Taggerをインストールするか、既存のインストールパスを設定してください。" -ForegroundColor Yellow

        $choice = Read-Host "1: 既存のWD14 Taggerのパスを設定する, 2: WD14 Taggerの公式サイトを開く, 0: キャンセル"

        switch ($choice) {
            "1" {
                $newPath = Read-Host "WD14 Taggerのパスを入力してください"
                if ($newPath -and (Test-Path $newPath)) {
                    $WD14_TAGGER_PATH = $newPath
                    Write-Host "WD14 Taggerのパスを設定しました: $WD14_TAGGER_PATH" -ForegroundColor Green
                    return $true
                } else {
                    Write-Host "指定されたパスが見つかりません: $newPath" -ForegroundColor Red
                    return $false
                }
            }
            "2" {
                # WD14 Taggerの公式サイトやリポジトリのURLを開く
                Start-Process "https://github.com/toriato/stable-diffusion-webui-wd14-tagger"
                return $false
            }
            default {
                return $false
            }
        }
    } else {
        Write-Host "WD14 Taggerが見つかりました: $WD14_TAGGER_PATH" -ForegroundColor Green

        # Pythonスクリプトファイルを探す
        Set-Location $WD14_TAGGER_PATH
        $pythonScript = Get-ChildItem -Filter "*.py" | Where-Object { $_.Name -like "*tag*.py" -or $_.Name -eq "main.py" } | Select-Object -First 1

        if ($null -eq $pythonScript) {
            Write-Host "WD14 Taggerの実行ファイル（.py）が見つかりません。" -ForegroundColor Red
            return $false
        } else {
            Write-Host "WD14 Taggerの実行ファイルが見つかりました: $($pythonScript.Name)" -ForegroundColor Green
            return $true
        }
    }
}

# 既存画像のワークフロー
function Run-Existing-Images-Workflow {
    $imageFolder = Read-Host "解析する画像フォルダのパスを入力してください"

    if (-not (Test-Path $imageFolder)) {
        Write-Host "指定されたフォルダが見つかりません: $imageFolder" -ForegroundColor Red
        return
    }

    # ステップ1: WD14 Taggerで画像解析
    $result = Run-WD14-Tagger -imageFolder $imageFolder
    if (-not $result) { return }

    # ステップ2: TXT MATOMEでYAML変換
    $result = Run-TXT-MATOME -txtFolder $TaggerOutputFolder
    if (-not $result) { return }

    Write-Host "ワークフロー完了！以下のYAMLファイルが生成されました:" -ForegroundColor Cyan
    Write-Host $YamlOutputPath -ForegroundColor Yellow
    Start-Process "explorer.exe" -ArgumentList "/select,$YamlOutputPath"
}

# コマンドライン引数で指定された場合は直接実行
if (-not [string]::IsNullOrEmpty($SellerID)) {
    Run-Yahoo-Auction-Workflow -sellerID $SellerID
    exit
}

# メインループ
while ($true) {
    $choice = Show-Menu

    switch ($choice) {
        "1" {
            $sellerID = Read-Host "ヤフオクセラーIDを入力してください"
            Run-Yahoo-Auction-Workflow -sellerID $sellerID
            pause
        }
        "2" {
            $targetID = Read-Host "X(Twitter)のターゲットIDを入力してください"
            Run-X-Workflow -targetID $targetID
            pause
        }
        "3" {
            Run-Existing-Images-Workflow
            pause
        }
        "4" {
            Show-Settings
        }
        "0" {
            exit
        }
        default {
            Write-Host "無効な選択です。再度お試しください。" -ForegroundColor Red
            pause
        }
    }
}
