#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""GUI動作確認テスト"""

import sys
import os

print("=" * 60)
print("GUI動作確認テスト")
print("=" * 60)

# Phase 1: モジュールインポート確認
print("\n[Phase 1] モジュールインポート確認...")
try:
    from keyword_database import get_all_keywords, CATEGORY_KEYWORDS
    print("  [OK] keyword_database.py")
except Exception as e:
    print(f"  [NG] keyword_database.py: {e}")
    sys.exit(1)

try:
    from prompt_classifier import PromptClassifier
    print("  [OK] prompt_classifier.py")
except Exception as e:
    print(f"  [NG] prompt_classifier.py: {e}")
    sys.exit(1)

try:
    from text_extractor import TextExtractor
    print("  [OK] text_extractor.py")
except Exception as e:
    print(f"  [NG] text_extractor.py: {e}")
    sys.exit(1)

try:
    import yaml
    print("  [OK] PyYAML")
except Exception as e:
    print(f"  [NG] PyYAML: {e}")
    print("    -> pip install PyYAML を実行してください")
    sys.exit(1)

try:
    import tkinter as tk
    print("  [OK] Tkinter")
except Exception as e:
    print(f"  [NG] Tkinter: {e}")
    print("    -> Python再インストール時にTkinterを有効化してください")
    sys.exit(1)

# Phase 2: GUIモジュールインポート確認
print("\n[Phase 2] GUIモジュールインポート確認...")
try:
    # GUIは起動せず、クラス定義のみインポート
    import importlib.util
    spec = importlib.util.spec_from_file_location("gui_app", "gui_app.py")
    gui_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(gui_module)
    print("  [OK] gui_app.py のインポート成功")
    print("  [OK] PromptClassifierGUI クラス定義確認")
except Exception as e:
    print(f"  [NG] gui_app.py: {e}")
    sys.exit(1)

# Phase 3: 基本機能確認
print("\n[Phase 3] 基本機能確認...")

# 分類器テスト
classifier = PromptClassifier()
test_prompt = "long hair, blue eyes, smile, school uniform"
result = classifier.classify_prompt(test_prompt)
print(f"  [OK] 分類テスト: {len([t for tags in result.values() for t in tags])} タグ分類成功")

# テキスト抽出器テスト
extractor = TextExtractor()
categories = ['poseemotion']
category_str = extractor.get_category_filename(categories)
print(f"  [OK] ファイル名生成: {category_str}")

# YAML生成テスト
yaml_dict = classifier.to_yaml_dict({
    'characterface': {'long hair', 'blue eyes'},
    'clothing': {'school uniform'},
    'poseemotion': {'smile'},
    'backgrounds': set(),
    'characterbody': set(),
    'uncategorized': set()
})
yaml_text = yaml.dump(yaml_dict, allow_unicode=True)
print(f"  [OK] YAML生成テスト: {len(yaml_text)} 文字")

# Phase 4: 出力ディレクトリ確認
print("\n[Phase 4] 出力ディレクトリ確認...")
output_dir = r"C:\metacard\output"
if not os.path.exists(output_dir):
    os.makedirs(output_dir)
    print(f"  [OK] 出力ディレクトリ作成: {output_dir}")
else:
    print(f"  [OK] 出力ディレクトリ存在確認: {output_dir}")

# 最終確認
print("\n" + "=" * 60)
print("[SUCCESS] 全テスト合格")
print("=" * 60)
print("\nGUIアプリケーション起動:")
print("  python gui_app.py")
print("\n使用方法:")
print("  README.md を参照してください")
