#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
プロンプト分類エンジン
txtファイルからプロンプトを読み込み、カテゴリ別に分類
"""

import re
from keyword_database import CATEGORY_KEYWORDS

class PromptClassifier:
    def __init__(self):
        self.category_keywords = CATEGORY_KEYWORDS

    def normalize_tag(self, tag):
        """タグを正規化（小文字化、前後の空白除去）"""
        return tag.strip().lower()

    def classify_tag(self, tag):
        """
        単一タグを分類

        Args:
            tag (str): プロンプトタグ

        Returns:
            str: カテゴリ名（characterface, clothing, poseemotion, backgrounds, characterbody, uncategorized）
        """
        normalized_tag = self.normalize_tag(tag)

        # 各カテゴリのキーワードとマッチング
        for category, keywords in self.category_keywords.items():
            if normalized_tag in keywords:
                return category

        # マッチしない場合はuncategorized
        return 'uncategorized'

    def classify_prompt(self, prompt_line):
        """
        1行のプロンプトを分類

        Args:
            prompt_line (str): カンマ区切りのプロンプト行
                例: "long hair, blue eyes, smile, school uniform, classroom"

        Returns:
            dict: カテゴリ別に分類されたタグ
                {
                    'characterface': ['long hair', 'blue eyes'],
                    'clothing': ['school uniform'],
                    'poseemotion': ['smile'],
                    'backgrounds': ['classroom'],
                    'characterbody': [],
                    'uncategorized': []
                }
        """
        # 初期化
        classified = {
            'characterface': [],
            'clothing': [],
            'poseemotion': [],
            'backgrounds': [],
            'characterbody': [],
            'uncategorized': []
        }

        # タグ分割
        tags = [tag.strip() for tag in prompt_line.split(',') if tag.strip()]

        # 各タグを分類
        for tag in tags:
            category = self.classify_tag(tag)
            classified[category].append(tag)

        return classified

    def classify_file(self, file_path):
        """
        txtファイル全体を分類（旧形式：集約・重複除去）

        Args:
            file_path (str): 入力txtファイルのパス

        Returns:
            dict: カテゴリ別に集約されたタグリスト（重複除去済み）
                {
                    'characterface': set(['long hair', 'blue eyes', ...]),
                    'clothing': set(['school uniform', 'bikini', ...]),
                    ...
                }
        """
        # 初期化（setで重複除去）
        aggregated = {
            'characterface': set(),
            'clothing': set(),
            'poseemotion': set(),
            'backgrounds': set(),
            'characterbody': set(),
            'uncategorized': set()
        }

        # ファイル読み込み
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        # 各行を処理
        for line in lines:
            line = line.strip()
            if not line:
                continue

            # 1行を分類
            classified = self.classify_prompt(line)

            # 集約（重複除去）
            for category, tags in classified.items():
                aggregated[category].update(tags)

        return aggregated

    def classify_file_for_yaml(self, file_path):
        """
        txtファイル全体を分類（YAML形式用：行ごとにグループ化）

        Args:
            file_path (str): 入力txtファイルのパス

        Returns:
            dict: カテゴリ別に行ごとのタグをカンマ区切り文字列のリストとして返す
                {
                    'characterface': ["long hair, blue eyes", "short hair, red eyes", ...],
                    'clothing': ["school uniform", "bikini", ...],
                    ...
                }
        """
        # 初期化
        categorized_lines = {
            'characterface': [],
            'clothing': [],
            'poseemotion': [],
            'backgrounds': [],
            'characterbody': [],
            'uncategorized': []
        }

        # ファイル読み込み
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        # 各行を処理
        for line in lines:
            line = line.strip()
            if not line:
                continue

            # 1行を分類
            classified = self.classify_prompt(line)

            # 各カテゴリについて、タグをカンマ区切り文字列として追加
            for category, tags in classified.items():
                if tags:  # タグが存在する場合のみ
                    tag_string = ', '.join(tags)
                    categorized_lines[category].append(tag_string)

        return categorized_lines

    def to_yaml_dict(self, aggregated):
        """
        集約データをYAML出力用のdict形式に変換

        Args:
            aggregated (dict): classify_file()の戻り値

        Returns:
            dict: YAML出力用（setをlistに変換、ソート済み）
        """
        yaml_dict = {}
        for category, tags in aggregated.items():
            # setをソート済みlistに変換
            yaml_dict[category] = sorted(list(tags))

        return yaml_dict


def test_classifier():
    """テスト用関数"""
    classifier = PromptClassifier()

    # テストプロンプト
    test_prompts = [
        "long hair, blue eyes, smile, school uniform, classroom",
        "short hair, red eyes, angry, bikini, beach",
        "twin braids, green eyes, embarrassed, dress, garden",
        "ponytail, brown eyes, surprised, jacket, street",
    ]

    print("=" * 60)
    print("プロンプト分類テスト")
    print("=" * 60)

    for prompt in test_prompts:
        print(f"\n入力: {prompt}")
        result = classifier.classify_prompt(prompt)
        for category, tags in result.items():
            if tags:
                print(f"  [{category}] {', '.join(tags)}")


if __name__ == "__main__":
    test_classifier()
