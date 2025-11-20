#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""Phase 1, 2 の動作確認"""

from keyword_database import get_all_keywords
from prompt_classifier import PromptClassifier

print("=" * 60)
print("Phase 1: keyword_database.py 確認")
print("=" * 60)

keywords = get_all_keywords()
print(f"カテゴリ数: {len(keywords)}")
for cat, kw in keywords.items():
    print(f"  {cat:20s}: {len(kw):4d} keywords")

print("\n" + "=" * 60)
print("Phase 2: prompt_classifier.py 確認")
print("=" * 60)

classifier = PromptClassifier()

# テストプロンプト
test_prompt = "long hair, blue eyes, smile, school uniform, classroom, large breasts"
print(f"\n入力プロンプト:")
print(f"  {test_prompt}")

result = classifier.classify_prompt(test_prompt)
print(f"\n分類結果:")
for category, tags in result.items():
    if tags:
        print(f"  [{category}] {', '.join(tags)}")

print("\n✅ Phase 1, 2 動作確認完了")
