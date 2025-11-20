#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
テキスト抽出・並べ機能
複数txtファイルから特定カテゴリのタグを抽出し、1ファイル=1行として並べる
"""

import os
import glob
from datetime import datetime
from prompt_classifier import PromptClassifier


class TextExtractor:
    def __init__(self):
        self.classifier = PromptClassifier()

    def extract_from_folder(self, folder_path, selected_categories):
        """
        フォルダ内の全txtファイルから指定カテゴリのタグを抽出

        Args:
            folder_path (str): 対象フォルダのパス
            selected_categories (list): 抽出するカテゴリリスト
                例: ['poseemotion']
                例: ['clothing', 'poseemotion']
                例: ['characterface', 'clothing', 'poseemotion', 'backgrounds', 'characterbody', 'uncategorized']

        Returns:
            list: 各ファイルから抽出したタグの行リスト
                例: [
                    "all fours,open mouth,blush,:d,",
                    "looking at viewer,blush,looking back,cowboy shot,...",
                    "squatting,looking at viewer,blush,from below,arm up,"
                ]
        """
        # txtファイル一覧取得
        pattern = os.path.join(folder_path, '*.txt')
        txt_files = glob.glob(pattern)
        txt_files.sort()  # ファイル名順にソート

        if not txt_files:
            raise FileNotFoundError(f"フォルダ内にtxtファイルが見つかりません: {folder_path}")

        print(f"処理対象ファイル数: {len(txt_files)}")
        print(f"抽出カテゴリ: {', '.join(selected_categories)}")

        extracted_lines = []

        # 各ファイルを処理
        for txt_file in txt_files:
            filename = os.path.basename(txt_file)

            # ファイル読み込み
            with open(txt_file, 'r', encoding='utf-8') as f:
                content = f.read().strip()

            if not content:
                print(f"  [SKIP] {filename}: 空ファイル")
                continue

            # プロンプトを分類
            classified = self.classifier.classify_prompt(content)

            # 指定カテゴリのタグだけを抽出
            extracted_tags = []
            for category in selected_categories:
                if category in classified:
                    extracted_tags.extend(classified[category])

            # 1行として結合（カンマ区切り）
            line = ','.join(extracted_tags)
            if line:
                line += ','  # 末尾にカンマ追加

            extracted_lines.append(line)
            print(f"  [OK] {filename}: {len(extracted_tags)} tags")

        return extracted_lines

    def save_to_file(self, extracted_lines, output_path):
        """
        抽出したテキストをファイルに保存

        Args:
            extracted_lines (list): extract_from_folder()の戻り値
            output_path (str): 出力ファイルパス
        """
        with open(output_path, 'w', encoding='utf-8') as f:
            for line in extracted_lines:
                f.write(line + '\n')

        print(f"\n保存完了: {output_path}")
        print(f"  行数: {len(extracted_lines)}")

    def get_category_filename(self, selected_categories):
        """
        選択カテゴリからファイル名用の文字列を生成

        Args:
            selected_categories (list): カテゴリリスト

        Returns:
            str: ファイル名用文字列
                例: 'poseemotion'
                例: 'clothing+poseemotion'
                例: 'all'
        """
        all_categories = ['characterface', 'clothing', 'poseemotion',
                         'backgrounds', 'characterbody', 'uncategorized']

        if set(selected_categories) == set(all_categories):
            return 'all'
        elif len(selected_categories) == 1:
            return selected_categories[0]
        else:
            return '+'.join(sorted(selected_categories))


def test_extractor():
    """テスト用関数"""
    print("=" * 60)
    print("テキスト抽出機能テスト")
    print("=" * 60)

    # テスト用フォルダ作成
    test_folder = r"C:\metacard\test_input"
    os.makedirs(test_folder, exist_ok=True)

    # テストファイル作成
    test_files = {
        'test_001.txt': 'all fours, breasts, open mouth, blush, cleavage, :d, teeth, upper teeth only, lips',
        'test_002.txt': 'ass, breasts, looking at viewer, blush, looking back, cowboy shot, thighs, from behind, from below, back, standing, looking down',
        'test_003.txt': 'girl, squatting, solo, breasts, armpits, large breasts, looking at viewer, blush, thighs, from below, ceiling, arm up, armpit peek',
    }

    for filename, content in test_files.items():
        filepath = os.path.join(test_folder, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

    print(f"テストファイル作成: {test_folder}")
    print()

    # テキスト抽出実行
    extractor = TextExtractor()

    # パターン1: poseemotion のみ抽出
    print("パターン1: poseemotion のみ抽出")
    print("-" * 60)
    selected_categories = ['poseemotion']
    extracted = extractor.extract_from_folder(test_folder, selected_categories)

    print("\n抽出結果:")
    for i, line in enumerate(extracted, 1):
        print(f"{i}. {line}")

    # 出力ファイル保存
    category_str = extractor.get_category_filename(selected_categories)
    date_str = datetime.now().strftime("%Y%m%d")
    output_file = rf"C:\metacard\output\prompts_extracted_{category_str}_{date_str}.txt"
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    extractor.save_to_file(extracted, output_file)


if __name__ == "__main__":
    test_extractor()
