# プロンプト分類ツール - Mac版対応 要件定義書

## 1. 目的・背景

### 1.1 目的
Windows版として開発された「プロンプト分類ツール」をmacOS環境でも使用可能にする。

### 1.2 背景
- 現在Windows版のみ配布中（.exe形式）
- StabilityMatrix等のAI画像生成ツールはMacユーザーも多い
- クロスプラットフォーム対応により、より広いユーザー層に提供可能

### 1.3 スコープ
Windows版と同等の機能をmacOS環境で提供する。

---

## 2. ターゲット環境

### 2.1 対応OS
- **macOS 11 Big Sur 以降**（Intel / Apple Silicon 両対応）
- 理由：PyInstaller 6.x が macOS 11+ を推奨

### 2.2 必要環境
- なし（スタンドアロンアプリとして配布）
- Pythonインストール不要

---

## 3. 技術的実現可能性

### 3.1 現在の技術スタック（Windows版）

| 項目 | 技術 | Mac対応状況 |
|------|------|-----------|
| プログラミング言語 | Python 3.13 | ✅ 完全対応 |
| GUI フレームワーク | Tkinter | ✅ 完全対応（macOS標準） |
| 依存ライブラリ | PyYAML 6.0.1 | ✅ 完全対応 |
| パッケージング | PyInstaller 6.16.0 | ✅ 完全対応 |

### 3.2 コード変更の必要性

#### ✅ 変更不要（クロスプラットフォーム対応済み）
```python
# keyword_database.py - Pythonセット型、変更不要
CATEGORY_KEYWORDS = {
    'characterface': {...},
    'clothing': {...},
    ...
}

# prompt_classifier.py - 文字列処理のみ、変更不要
def classify_prompt(self, prompt_text):
    ...

# text_extractor.py - os.path使用、自動対応
def extract_from_folder(self, folder_path, categories):
    ...

# gui_app.py - Tkinter標準機能、変更不要
import tkinter as tk
from tkinter import filedialog
```

#### ⚠️ 軽微な調整が必要
```python
# ファイルパスの扱い（現状は問題なし）
# Windows: C:/metacard/input/
# Mac: /Users/username/Documents/metacard/input/
# → pathlib.Path 使用で自動対応
```

### 3.3 結論
**✅ コード変更なしで Mac 対応可能**
- 既存のPythonコードは完全にクロスプラットフォーム
- PyInstallerでmacOS向けビルドのみ実施

---

## 4. Mac版の配布形式

### 4.1 オプション比較

| 形式 | 説明 | メリット | デメリット |
|------|------|---------|-----------|
| **.app バンドル** | macOS標準アプリケーション形式 | ・Finderからダブルクリックで起動<br>・アプリケーションフォルダに配置可能<br>・macOSネイティブな使用感 | ・初回起動時に「開発元未確認」警告 |
| **DMGファイル** | .app を含むディスクイメージ | ・macOS標準の配布形式<br>・ドラッグ&ドロップでインストール<br>・プロフェッショナルな印象 | ・作成に専用ツール必要 |
| **ZIP圧縮** | .app を ZIP で圧縮 | ・シンプル<br>・Windows版と統一形式 | ・やや非標準 |

### 4.2 推奨配布形式
**Phase 1**: ZIP形式（.app バンドル）
- 理由：実装が簡単、Windows版と統一感
- ファイル名例：`プロンプト分類ツール_v1.0_macOS.zip`

**Phase 2**（オプション）: DMG形式
- より洗練された配布方法
- create-dmg 等のツール使用

---

## 5. Mac特有の考慮事項

### 5.1 セキュリティ（Gatekeeper）

**問題**：macOS Catalinaから、署名なしアプリは初回起動時にブロックされる

**対応方法**：
```
ユーザーマニュアルに記載：
1. 右クリック → 「開く」を選択
2. 「開く」ボタンをクリック
3. 以降は通常通りダブルクリックで起動可能
```

**将来対応**（オプション）：
- Apple Developer アカウント取得（年間 $99 USD）
- コード署名・公証（Notarization）実施
- → 警告なしで起動可能

### 5.2 Apple Silicon（M1/M2/M3）対応

**オプション1：Universal Binary**
```bash
# Intel + Apple Silicon 両対応（サイズ約2倍）
pyinstaller --target-arch universal2 gui_app.py
```

**オプション2：個別ビルド**
```bash
# Intel Mac用
pyinstaller --target-arch x86_64 gui_app.py

# Apple Silicon用
pyinstaller --target-arch arm64 gui_app.py
```

**推奨**：Universal Binary（1つで全Mac対応）

### 5.3 ファイルダイアログ

Tkinter の filedialog は macOS でもネイティブダイアログを使用
- ✅ 変更不要

### 5.4 フォント・UI

macOS の Tkinter はシステムフォント（San Francisco）を自動使用
- ✅ 変更不要

---

## 6. 開発・ビルドプロセス

### 6.1 Mac環境での開発フロー

```bash
# 1. Python環境セットアップ（Mac）
python3 -m venv .venv
source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
pip install pyinstaller

# 2. 動作確認
python gui_app.py

# 3. .app バンドル生成
pyinstaller --onefile --windowed \
  --name "プロンプト分類ツール" \
  --target-arch universal2 \
  gui_app.py

# 4. 確認
open dist/プロンプト分類ツール.app

# 5. 配布用ZIP作成
cd dist
zip -r "プロンプト分類ツール_v1.0_macOS.zip" "プロンプト分類ツール.app"
```

### 6.2 クロスプラットフォームビルド戦略

| ビルド環境 | 生成物 | 備考 |
|----------|-------|------|
| Windows PC | .exe | PyInstaller（Windows） |
| Mac (Intel/Apple Silicon) | .app | PyInstaller（macOS） |

**重要**：各OS上でビルド必須（クロスコンパイル不可）

---

## 7. 配布パッケージ構成

### 7.1 Mac版配布ファイル構造

```
プロンプト分類ツール_v1.0_macOS.zip
└── プロンプト分類ツール.app/         # macOSアプリケーションバンドル
    ├── Contents/
    │   ├── MacOS/
    │   │   └── プロンプト分類ツール  # 実行ファイル
    │   ├── Resources/
    │   ├── Info.plist
    │   └── Frameworks/               # 埋め込みライブラリ
    └── sample_input/                 # サンプルファイル（オプション）
        ├── sample_prompt_001.txt
        ├── sample_prompt_002.txt
        └── sample_prompt_003.txt
```

### 7.2 追加ドキュメント

**使い方_macOS.md**（新規作成）
```markdown
# macOS版 使い方

## 初回起動方法
1. ZIPファイルを解凍
2. プロンプト分類ツール.app を右クリック
3. 「開く」を選択
4. 「開く」ボタンをクリック

## 以降の使い方
Windows版と同じ
```

---

## 8. テスト計画

### 8.1 テスト環境

| 環境 | 必須/推奨 | 備考 |
|------|---------|------|
| macOS 14 Sonoma (Apple Silicon) | 必須 | 最新環境 |
| macOS 13 Ventura (Intel) | 推奨 | Intel Mac ユーザー |
| macOS 11 Big Sur | オプション | 最小対応バージョン |

### 8.2 テスト項目

- [ ] アプリケーション起動
- [ ] ファイル選択ダイアログ
- [ ] フォルダ選択ダイアログ
- [ ] YAML生成機能
- [ ] テキスト抽出機能
- [ ] ファイル保存
- [ ] クリップボードコピー
- [ ] 日本語表示
- [ ] サンプルファイル処理

---

## 9. 制限事項

### 9.1 既知の制限

1. **コード署名なし**
   - 初回起動時に Gatekeeper 警告
   - 対応：ユーザーマニュアルに手順記載

2. **自動更新機能なし**
   - 新バージョンは手動ダウンロード

3. **Mac環境でのビルドが必須**
   - Windows環境からMac版をビルド不可

### 9.2 将来的な改善

- Apple Developer アカウント取得・コード署名
- DMG形式での配布
- 自動更新機能（Sparkle等）

---

## 10. 実現可能性評価

### 10.1 技術的実現可能性
**✅ 高い（95%）**

**理由**：
- Python + Tkinter は完全にクロスプラットフォーム対応
- 既存コードの変更不要
- PyInstaller が macOS を公式サポート
- 依存ライブラリ（PyYAML）も完全対応

**懸念点**：
- Mac環境でのビルドが必須（Windows環境からは不可）

### 10.2 開発工数見積もり

| フェーズ | 作業内容 | 工数（時間） | 備考 |
|---------|---------|------------|------|
| **Phase 1: 環境構築** | Mac環境セットアップ、PyInstaller導入 | 0.5h | Mac所有前提 |
| **Phase 2: ビルド** | .app バンドル生成、動作確認 | 1h | |
| **Phase 3: テスト** | 各機能の動作確認 | 1h | |
| **Phase 4: ドキュメント** | 使い方_macOS.md 作成 | 0.5h | |
| **Phase 5: 配布準備** | ZIP作成、README更新 | 0.5h | |
| **合計** | | **3.5時間** | Mac環境所有の場合 |

### 10.3 前提条件
- ✅ Mac環境へのアクセス（Intel または Apple Silicon）
- ✅ Python 3.11+ がインストール可能
- ✅ インターネット接続（依存パッケージダウンロード用）

---

## 11. 推奨アプローチ

### 11.1 段階的リリース

**Step 1: ミニマムリリース（推奨）**
- Universal Binary .app をZIP配布
- 使い方_macOS.md 添付
- 工数：3.5時間

**Step 2: 洗練版（将来）**
- DMG形式配布
- Apple Developer登録・コード署名
- 工数：+5時間 + $99/年

### 11.2 実装手順

```bash
# Mac環境で実行
git clone <repository>
cd metacard

# 仮想環境作成
python3 -m venv .venv
source .venv/bin/activate

# 依存パッケージインストール
pip install -r requirements.txt
pip install pyinstaller

# 動作確認
python gui_app.py

# .app ビルド
pyinstaller --onefile --windowed \
  --name "プロンプト分類ツール" \
  --target-arch universal2 \
  gui_app.py

# サンプルファイルコピー
cp -r sample_input dist/

# ZIP作成
cd dist
zip -r "../プロンプト分類ツール_v1.0_macOS.zip" \
  "プロンプト分類ツール.app" \
  sample_input/

# 完成！
cd ..
ls -lh プロンプト分類ツール_v1.0_macOS.zip
```

---

## 12. 結論

### ✅ Mac版対応は実現可能

**理由**：
1. 既存コードは完全にクロスプラットフォーム対応
2. 必要な作業はビルド・パッケージングのみ
3. 工数は約3.5時間（Mac環境所有の場合）

**次のステップ**：
1. Mac環境の確保
2. 上記手順に従ってビルド実施
3. 動作確認・テスト
4. 配布

**配布形式**：
- `プロンプト分類ツール_v1.0_macOS.zip`（約10MB）
- Universal Binary（Intel + Apple Silicon 両対応）
- 使い方_macOS.md 添付

---

## 付録A: Mac版 README テンプレート

```markdown
# プロンプト分類ツール - macOS版

## 対応OS
- macOS 11 Big Sur 以降
- Intel Mac / Apple Silicon (M1/M2/M3) 両対応

## 初回起動方法
1. ZIPファイルを解凍
2. 「プロンプト分類ツール.app」を右クリック
3. 「開く」を選択
4. 「開く」ボタンをクリック

**注意**: ダブルクリックでは「開発元を確認できません」エラーが出ます。
右クリック→「開く」で回避できます。

## 使い方
Windows版と同じです。詳細は「使い方.md」を参照してください。

## トラブルシューティング
- **起動できない**: 右クリック→「開く」を試してください
- **ファイルが選べない**: cmd+A で全選択できます
- **日本語が文字化け**: macOS 11+ で自動解決されます
```

---

## 付録B: 開発者向け注意事項

### PyInstaller macOS ビルド時の注意点

```bash
# ⚠️ 必ず --windowed フラグを使用
# 理由：ターミナルウィンドウを非表示にする
pyinstaller --onefile --windowed gui_app.py

# ⚠️ Universal Binary ビルド時の警告
# 一部ライブラリが片方のアーキテクチャのみ対応の場合、警告が出る
# PyYAML, Tkinter は両対応のため問題なし

# ⚠️ アイコン追加（オプション）
pyinstaller --onefile --windowed \
  --icon=icon.icns \  # macOS用アイコン（.icns形式）
  gui_app.py
```

### デバッグ方法

```bash
# .app バンドル内の実行ファイルを直接起動してエラー確認
./dist/プロンプト分類ツール.app/Contents/MacOS/プロンプト分類ツール

# ログ確認
Console.app → ユーザーレポート
```

---

**作成日**: 2025-10-26
**バージョン**: 1.0
**ステータス**: 実現可能性確認済み
