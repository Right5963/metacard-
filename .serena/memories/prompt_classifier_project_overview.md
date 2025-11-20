# プロンプト分類ツール プロジェクト概要

## プロジェクト情報
- **ディレクトリ**: C:\metacard\
- **目的**: txtファイルからプロンプトを6カテゴリに自動分類し、YAML生成 or テキスト抽出する
- **アーキテクチャ**: Tkinter スタンドアロンデスクトップアプリ（ポート不要）

## 2つの出力モード
1. **YAML生成モード**: ワイルドカード形式（StabilityMatrix互換）
2. **テキスト抽出モード**: カテゴリ別抽出（Stable Diffusion用、複数ファイル対応、カテゴリ複数選択可能）

## 6つの分類カテゴリ
- characterface: 髪型、目の色、髪色、表情
- clothing: 服、アクセサリー、靴、下着
- poseemotion: 姿勢、動作、表情、感情
- backgrounds: 場所、環境、シーン
- characterbody: 体型、肌の色
- uncategorized: その他

## 開発フェーズ
- Phase 1: keyword_database.py ✅ 完了
- Phase 2: prompt_classifier.py ✅ 完了
- Phase 3: テキスト抽出機能 🔄 進行中
- Phase 4: GUI開発（2モード対応）
- Phase 5: テスト

## 重要な実装ポイント
- テキスト抽出: 1ファイル = 1行として並べる
- カテゴリ複数選択対応（チェックボックス）
- 完全オフライン動作
- 依存: PyYAML のみ
