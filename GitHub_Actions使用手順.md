# GitHub Actions で Mac版を自動ビルドする手順

## 📝 概要

Mac環境がなくても、GitHub Actionsを使用してmacOS版の実行ファイル（.app）を自動生成できます。

**メリット**：
- ✅ Mac不要 - GitHubのmacOSランナーが自動ビルド
- ✅ 無料 - パブリックリポジトリなら完全無料
- ✅ 自動化 - タグをプッシュするだけで自動ビルド
- ✅ 両OS対応 - Windows版とMac版を同時生成

---

## 🚀 セットアップ手順

### Step 1: GitHubリポジトリ作成

```bash
# 1. GitHubで新規リポジトリを作成
# リポジトリ名例: prompt-classifier-tool

# 2. ローカルでGit初期化
cd C:/metacard
git init
git add .
git commit -m "Initial commit"

# 3. GitHubリポジトリと連携
git remote add origin https://github.com/YOUR_USERNAME/prompt-classifier-tool.git
git branch -M main
git push -u origin main
```

### Step 2: GitHub Actionsワークフロー確認

既に `.github/workflows/build-releases.yml` が作成されています。
このファイルがGitHubにプッシュされていることを確認してください。

```bash
# ワークフローファイルの存在確認
ls .github/workflows/build-releases.yml
```

### Step 3: 初回ビルド実行

**方法A: タグを使った自動ビルド（推奨）**

```bash
# バージョンタグを作成してプッシュ
git tag v1.0
git push origin v1.0
```

**方法B: 手動実行**

1. GitHubリポジトリの「Actions」タブに移動
2. 「Build Releases」ワークフローを選択
3. 「Run workflow」ボタンをクリック
4. 「Run workflow」を再度クリック

---

## 📦 ビルド完了後のダウンロード

### 自動リリース（タグ使用時）

1. GitHubリポジトリの「Releases」タブに移動
2. 最新リリースをクリック
3. Assets セクションから以下をダウンロード：
   - `プロンプト分類ツール_v1.0_Windows.zip`
   - `プロンプト分類ツール_v1.0_macOS.zip`

### Artifacts（手動実行時）

1. GitHubリポジトリの「Actions」タブに移動
2. 完了したワークフロー実行をクリック
3. 下部の「Artifacts」セクションからダウンロード：
   - `windows-build`
   - `macos-build`

---

## 🔄 更新時の手順

### コード変更後の再ビルド

```bash
# 1. コード変更
# （gui_app.py, keyword_database.py 等を編集）

# 2. コミット
git add .
git commit -m "Update: 機能追加の説明"
git push origin main

# 3. 新しいバージョンタグを作成
git tag v1.1
git push origin v1.1

# 4. 自動的にビルド開始
# GitHubのActionsタブで進行状況を確認
```

---

## 📊 ワークフローの動作内容

### 実行される処理

1. **Windows環境での処理**：
   ```
   ✓ Pythonセットアップ
   ✓ 依存パッケージインストール
   ✓ PyInstallerでexe生成
   ✓ 配布パッケージ作成
   ✓ ZIPファイル生成
   ```

2. **macOS環境での処理**：
   ```
   ✓ Pythonセットアップ
   ✓ 依存パッケージインストール
   ✓ PyInstallerで.app生成（Universal Binary）
   ✓ 配布パッケージ作成
   ✓ ZIPファイル生成
   ```

3. **リリース作成**（タグ使用時のみ）：
   ```
   ✓ Windows版ZIPをアップロード
   ✓ macOS版ZIPをアップロード
   ✓ GitHubリリースページに公開
   ```

### 実行時間

- **Windows ビルド**: 約3-5分
- **macOS ビルド**: 約3-5分
- **合計**: 約6-10分

---

## 💡 便利な使い方

### 1. ドラフトリリース（テスト用）

ワークフローファイルの `draft: false` を `draft: true` に変更：

```yaml
- name: Create Release
  uses: softprops/action-gh-release@v1
  with:
    draft: true  # ← trueに変更
```

これにより、非公開のドラフトリリースとして作成されます。

### 2. プレリリース版

ベータ版やテスト版の場合：

```yaml
- name: Create Release
  uses: softprops/action-gh-release@v1
  with:
    prerelease: true  # ← trueに変更
```

タグ名も `v1.0-beta` 等に変更すると分かりやすいです。

### 3. カスタムリリースノート

自動生成されたリリースに説明を追加：

```yaml
- name: Create Release
  uses: softprops/action-gh-release@v1
  with:
    body: |
      ## 新機能
      - ✨ 統計情報除外機能を追加
      - 🐛 YAMLフォーマット修正

      ## ダウンロード
      - Windows版: プロンプト分類ツール_v1.0_Windows.zip
      - macOS版: プロンプト分類ツール_v1.0_macOS.zip
```

---

## 🐛 トラブルシューティング

### Q: ビルドが失敗する

**A**: GitHub Actionsの「Actions」タブでログを確認：
1. 失敗したワークフローをクリック
2. 失敗したジョブ（Windows/macOS）をクリック
3. エラーメッセージを確認

よくあるエラー：
- **依存パッケージエラー**: `requirements.txt` に全依存関係が記載されているか確認
- **PyInstallerエラー**: `gui_app.py` が正しくインポートできるか確認

### Q: macOS版がダウンロードできない

**A**:
1. 「Actions」タブで macOS ジョブが成功しているか確認
2. Artifacts セクションに `macos-build` があるか確認
3. タグ使用時は「Releases」タブでファイルを確認

### Q: 無料枠を使い切った

**A**:
- パブリックリポジトリ: 完全無料（制限なし）
- プライベートリポジトリ: 月2000分まで無料

使用量確認：
1. GitHubアカウント → Settings
2. Billing and plans
3. Actions の使用量を確認

---

## 📋 完全自動化フロー

理想的な開発フロー：

```bash
# 1. 機能開発
vim gui_app.py

# 2. ローカルテスト
python gui_app.py

# 3. コミット
git add .
git commit -m "Add: 新機能追加"
git push origin main

# 4. リリース準備
git tag v1.1
git push origin v1.1

# 5. 完了！
# → GitHubが自動的に両OS版をビルド
# → Releasesページに公開
# → ユーザーはダウンロード可能
```

---

## 🔐 セキュリティ注意事項

### Secretsの管理

リポジトリにAPIキー等を含めないでください。

必要な場合：
1. GitHubリポジトリ → Settings → Secrets and variables → Actions
2. 「New repository secret」をクリック
3. ワークフローで `${{ secrets.YOUR_SECRET }}` として参照

### GITHUB_TOKEN

`GITHUB_TOKEN` は自動的に提供され、リリース作成に使用されます。
追加設定は不要です。

---

## 📚 参考リンク

- [GitHub Actions公式ドキュメント](https://docs.github.com/ja/actions)
- [PyInstaller公式ドキュメント](https://pyinstaller.org/)
- [actions/setup-python](https://github.com/actions/setup-python)
- [softprops/action-gh-release](https://github.com/softprops/action-gh-release)

---

## ✅ チェックリスト

セットアップ完了確認：

- [ ] GitHubリポジトリを作成した
- [ ] `.github/workflows/build-releases.yml` をプッシュした
- [ ] タグをプッシュして初回ビルドを実行した
- [ ] Windows版ZIPがダウンロードできた
- [ ] macOS版ZIPがダウンロードできた
- [ ] Releasesページで両方のファイルを確認した

---

**作成日**: 2025-10-26
**対象**: Mac環境なしでmacOS版をビルドする方法
