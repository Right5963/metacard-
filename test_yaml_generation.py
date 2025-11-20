#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
YAML生成機能のテスト
"""

import yaml
from prompt_classifier import PromptClassifier

def test_yaml_generation():
    """YAML生成のテスト"""
    classifier = PromptClassifier()

    # テストファイルパス
    test_file = "test_yaml_input.txt"

    print("=" * 60)
    print("YAML生成テスト")
    print("=" * 60)

    # 新しいYAML形式用の関数をテスト
    print("\n【classify_file_for_yaml() の出力】")
    yaml_dict = classifier.classify_file_for_yaml(test_file)

    # YAML形式で出力
    yaml_text = yaml.dump(yaml_dict, allow_unicode=True, sort_keys=False, default_flow_style=False)
    print(yaml_text)

    # 統計情報
    print("\n【統計情報】")
    for category, entries in yaml_dict.items():
        print(f"{category}: {len(entries)} エントリー")
        if entries:
            print(f"  例: {entries[0]}")

    # 期待される形式の確認
    print("\n【形式チェック】")
    print(f"✓ 各カテゴリの値の型: {type(yaml_dict['characterface'])}")
    print(f"✓ 各エントリーの型: {type(yaml_dict['characterface'][0]) if yaml_dict['characterface'] else 'N/A'}")

    # 要件定義書の期待形式と比較
    print("\n【要件定義書の期待形式との比較】")
    print("期待:")
    print("  characterface:")
    print('    - "long hair, blue eyes"')
    print('    - "short hair, red eyes"')
    print("\n実際:")
    for i, entry in enumerate(yaml_dict['characterface'][:2]):
        print(f'    - "{entry}"')

if __name__ == "__main__":
    test_yaml_generation()
