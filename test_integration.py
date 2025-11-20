#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
統合テスト - 実際のサンプルプロンプトで分類機能を検証
"""

import os
from prompt_classifier import PromptClassifier

def test_sample_files():
    """サンプルファイルで分類テスト"""
    input_dir = 'input'
    test_files = [
        'test_sample_01.txt',
        'test_sample_02.txt',
        'test_sample_03.txt',
        'test_sample_04.txt',
        'test_sample_05.txt'
    ]

    print("=" * 80)
    print("統合テスト: サンプルプロンプトの分類結果")
    print("=" * 80)

    classifier = PromptClassifier()

    for filename in test_files:
        filepath = os.path.join(input_dir, filename)

        if not os.path.exists(filepath):
            print(f"\nファイルが見つかりません: {filepath}")
            continue

        # ファイル読み込み
        with open(filepath, 'r', encoding='utf-8') as f:
            prompt_text = f.read().strip()

        print(f"\n{filename}")
        print(f"プロンプト: {prompt_text[:100]}...")

        # 分類実行
        result = classifier.classify_prompt(prompt_text)

        # 結果表示
        print("\n分類結果:")
        for category, tags in result.items():
            if tags:
                print(f"  {category}: {len(tags)}個")
                print(f"    → {', '.join(sorted(tags))}")

        # アングル・視点キーワードの検出確認
        poseemotion_tags = result.get('poseemotion', [])
        angle_keywords = [
            'from below', 'low angle', 'aerial view', "bird's eye view",
            'cowboy shot', 'extreme close-up', 'face only', 'full body',
            'front view', 'pov', 'looking at viewer'
        ]

        detected_angles = [tag for tag in poseemotion_tags if tag in angle_keywords]
        if detected_angles:
            print(f"\n  [OK] アングル・視点キーワード検出: {', '.join(detected_angles)}")

    print("\n" + "=" * 80)
    print("統合テスト完了")
    print("=" * 80)

if __name__ == '__main__':
    test_sample_files()
