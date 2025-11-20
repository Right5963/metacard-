#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
プロンプト分類ツール GUI
2つのモード:
  Mode A: YAML生成モード
  Mode B: テキスト抽出・並べモード
"""

import os
import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
from datetime import datetime
import yaml
from prompt_classifier import PromptClassifier
from text_extractor import TextExtractor


class PromptClassifierGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("プロンプト分類ツール")
        self.root.geometry("900x700")

        # 分類器とテキスト抽出器の初期化
        self.classifier = PromptClassifier()
        self.extractor = TextExtractor()

        # モード選択変数
        self.mode = tk.StringVar(value="extract")  # "yaml" or "extract"

        # カテゴリ選択用の変数
        self.category_vars = {
            'characterface': tk.BooleanVar(value=False),
            'clothing': tk.BooleanVar(value=False),
            'poseemotion': tk.BooleanVar(value=False),
            'backgrounds': tk.BooleanVar(value=False),
            'characterbody': tk.BooleanVar(value=False),
            'uncategorized': tk.BooleanVar(value=False),
        }
        self.select_all_var = tk.BooleanVar(value=False)

        # 選択されたパス
        self.selected_path = ""

        # 保存用コンテンツ（統計情報を含まない）
        self.save_content = ""

        # GUI構築
        self.create_widgets()

    def create_widgets(self):
        """GUI要素を作成"""
        # メインフレーム
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)

        # ========== モード選択エリア ==========
        mode_frame = ttk.LabelFrame(main_frame, text="モード選択", padding="10")
        mode_frame.grid(row=0, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=5)

        ttk.Radiobutton(mode_frame, text="Mode A: YAML生成モード",
                       variable=self.mode, value="yaml",
                       command=self.on_mode_change).grid(row=0, column=0, padx=10)
        ttk.Radiobutton(mode_frame, text="Mode B: テキスト抽出・並べモード",
                       variable=self.mode, value="extract",
                       command=self.on_mode_change).grid(row=0, column=1, padx=10)

        # ========== 入力選択エリア ==========
        input_frame = ttk.LabelFrame(main_frame, text="入力ファイル/フォルダ", padding="10")
        input_frame.grid(row=1, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=5)

        self.path_label = ttk.Label(input_frame, text="選択なし", foreground="gray")
        self.path_label.grid(row=0, column=0, sticky=tk.W, padx=5)

        self.select_button = ttk.Button(input_frame, text="フォルダを選択",
                                       command=self.select_folder)
        self.select_button.grid(row=0, column=1, padx=5)

        # ========== カテゴリ選択エリア ==========
        category_frame = ttk.LabelFrame(main_frame, text="抽出カテゴリ選択", padding="10")
        category_frame.grid(row=2, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=5)

        # 全て選択チェックボックス
        ttk.Checkbutton(category_frame, text="全て選択",
                       variable=self.select_all_var,
                       command=self.toggle_select_all).grid(row=0, column=0, columnspan=3, sticky=tk.W, pady=5)

        ttk.Separator(category_frame, orient='horizontal').grid(row=1, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=5)

        # 個別カテゴリチェックボックス
        categories = [
            ('characterface', '顔(髪型・目・表情など)'),
            ('clothing', '服装(服・靴・アクセサリーなど)'),
            ('poseemotion', 'ポーズ・感情(動作・表情)'),
            ('backgrounds', '背景(場所・環境)'),
            ('characterbody', '体の特徴(体型・肌色など)'),
            ('uncategorized', 'その他(未分類)')
        ]

        for i, (key, label) in enumerate(categories):
            row = 2 + i // 2
            col = i % 2
            ttk.Checkbutton(category_frame, text=label,
                          variable=self.category_vars[key]).grid(row=row, column=col, sticky=tk.W, padx=10, pady=2)

        # ========== プレビューエリア ==========
        preview_frame = ttk.LabelFrame(main_frame, text="プレビュー", padding="10")
        preview_frame.grid(row=3, column=0, columnspan=2, sticky=(tk.W, tk.E, tk.N, tk.S), pady=5)
        main_frame.rowconfigure(3, weight=1)

        self.preview_text = scrolledtext.ScrolledText(preview_frame, wrap=tk.WORD,
                                                      width=80, height=20)
        self.preview_text.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        preview_frame.columnconfigure(0, weight=1)
        preview_frame.rowconfigure(0, weight=1)

        # ========== 実行ボタンエリア ==========
        button_frame = ttk.Frame(main_frame)
        button_frame.grid(row=4, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=10)

        self.execute_button = ttk.Button(button_frame, text="実行",
                                        command=self.execute, style='Accent.TButton')
        self.execute_button.pack(side=tk.LEFT, padx=5)

        ttk.Button(button_frame, text="クリップボードにコピー",
                  command=self.copy_to_clipboard).pack(side=tk.LEFT, padx=5)

        ttk.Button(button_frame, text="ファイルに保存",
                  command=self.save_to_file).pack(side=tk.LEFT, padx=5)

        ttk.Button(button_frame, text="クリア",
                  command=self.clear_preview).pack(side=tk.LEFT, padx=5)

        # 初期状態設定
        self.on_mode_change()

    def on_mode_change(self):
        """モード変更時の処理"""
        mode = self.mode.get()

        if mode == "yaml":
            self.select_button.config(text="ファイルを選択", command=self.select_file)
            self.execute_button.config(text="YAML生成")
        else:  # extract
            self.select_button.config(text="フォルダを選択", command=self.select_folder)
            self.execute_button.config(text="テキスト抽出")

    def select_file(self):
        """複数ファイル選択 (YAMLモード用)"""
        filepaths = filedialog.askopenfilenames(
            title="プロンプトファイルを選択（複数選択可）",
            filetypes=[("Text files", "*.txt"), ("All files", "*.*")]
        )

        if filepaths:
            self.selected_path = list(filepaths)  # タプルをリストに変換
            file_count = len(filepaths)
            if file_count == 1:
                self.path_label.config(text=os.path.basename(filepaths[0]), foreground="black")
            else:
                self.path_label.config(text=f"{file_count}個のファイルを選択", foreground="black")

    def select_folder(self):
        """フォルダ選択 (テキスト抽出モード用)"""
        folderpath = filedialog.askdirectory(title="プロンプトファイルが入っているフォルダを選択")

        if folderpath:
            self.selected_path = folderpath
            self.path_label.config(text=folderpath, foreground="black")

    def toggle_select_all(self):
        """全て選択のトグル"""
        select_all = self.select_all_var.get()
        for var in self.category_vars.values():
            var.set(select_all)

    def get_selected_categories(self):
        """選択されたカテゴリのリストを取得"""
        return [key for key, var in self.category_vars.items() if var.get()]

    def execute(self):
        """実行ボタン押下時の処理"""
        if not self.selected_path:
            messagebox.showwarning("警告", "ファイルまたはフォルダを選択してください")
            return

        selected_categories = self.get_selected_categories()
        if not selected_categories and self.mode.get() == "extract":
            messagebox.showwarning("警告", "少なくとも1つのカテゴリを選択してください")
            return

        try:
            if self.mode.get() == "yaml":
                self.generate_yaml()
            else:
                self.extract_text()
        except Exception as e:
            messagebox.showerror("エラー", f"処理中にエラーが発生しました:\n{str(e)}")

    def generate_yaml(self):
        """YAML生成モードの実行"""
        # 複数ファイル対応
        file_paths = self.selected_path if isinstance(self.selected_path, list) else [self.selected_path]

        # 初期化
        categorized_lines = {
            'characterface': [],
            'clothing': [],
            'poseemotion': [],
            'backgrounds': [],
            'characterbody': [],
            'uncategorized': []
        }

        total_lines = 0
        # 複数ファイルから全行を読み込んで分類
        for file_path in file_paths:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()

            for line in lines:
                line = line.strip()
                if not line:
                    continue

                total_lines += 1
                # 1行を分類
                classified = self.classifier.classify_prompt(line)

                # 各カテゴリについて、タグをカンマ区切り文字列として追加
                for category, tags in classified.items():
                    if tags:
                        tag_string = ', '.join(tags)
                        categorized_lines[category].append(tag_string)

        # YAMLテキスト手動生成（StabilityMatrix互換形式）
        yaml_lines = []

        # character_mainセクション（ワイルドカード参照テンプレート）
        yaml_lines.append('character_main:')
        yaml_lines.append('  - "1girl, solo, __characterface__, __characterbody__, __clothing__, __poseemotion__, __backgrounds__, __uncategorized__"')
        yaml_lines.append('')

        # 各カテゴリのセクション
        for category in ['characterface', 'clothing', 'poseemotion', 'backgrounds', 'characterbody', 'uncategorized']:
            yaml_lines.append(f'{category}:')
            for tag_string in categorized_lines[category]:
                yaml_lines.append(f'  - "{tag_string}"')
            yaml_lines.append('')

        yaml_text = '\n'.join(yaml_lines)

        # 保存用コンテンツを保持（統計情報を含まない）
        self.save_content = yaml_text

        # プレビュー表示
        self.preview_text.delete('1.0', tk.END)
        self.preview_text.insert('1.0', yaml_text)

        # 統計情報表示
        stats = "\n\n===== 分類結果 =====\n"
        stats += f"処理ファイル数: {len(file_paths)}\n"
        stats += f"処理行数: {total_lines}\n"
        stats += "---\n"
        for category, tags in categorized_lines.items():
            stats += f"{category}: {len(tags)} エントリー\n"

        self.preview_text.insert(tk.END, stats)

        messagebox.showinfo("成功", f"{len(file_paths)}ファイル・{total_lines}行からYAML生成が完了しました")

    def extract_text(self):
        """テキスト抽出モードの実行"""
        selected_categories = self.get_selected_categories()

        # フォルダから抽出
        extracted_lines = self.extractor.extract_from_folder(
            self.selected_path,
            selected_categories
        )

        # プレビュー表示
        preview_text = "\n".join(extracted_lines)

        # 保存用コンテンツを保持（統計情報を含まない）
        self.save_content = preview_text

        self.preview_text.delete('1.0', tk.END)
        self.preview_text.insert('1.0', preview_text)

        # 統計情報
        stats = f"\n\n===== 抽出結果 =====\n"
        stats += f"処理ファイル数: {len(extracted_lines)}\n"
        stats += f"選択カテゴリ: {', '.join(selected_categories)}\n"

        self.preview_text.insert(tk.END, stats)

        messagebox.showinfo("成功", f"{len(extracted_lines)}ファイルからテキスト抽出が完了しました")

    def copy_to_clipboard(self):
        """クリップボードにコピー"""
        content = self.preview_text.get('1.0', tk.END).strip()
        if not content:
            messagebox.showwarning("警告", "コピーする内容がありません")
            return

        self.root.clipboard_clear()
        self.root.clipboard_append(content)
        messagebox.showinfo("成功", "クリップボードにコピーしました")

    def save_to_file(self):
        """ファイルに保存"""
        # 保存用コンテンツを使用（統計情報を除外）
        content = self.save_content.strip() if self.save_content else ""
        if not content:
            messagebox.showwarning("警告", "保存する内容がありません")
            return

        # ファイル名生成
        mode = self.mode.get()
        date_str = datetime.now().strftime("%Y%m%d")

        if mode == "yaml":
            default_name = f"prompts_classified_{date_str}.yaml"
            filetypes = [("YAML files", "*.yaml"), ("All files", "*.*")]
        else:
            category_str = self.extractor.get_category_filename(self.get_selected_categories())
            default_name = f"prompts_extracted_{category_str}_{date_str}.txt"
            filetypes = [("Text files", "*.txt"), ("All files", "*.*")]

        # 保存ダイアログ
        filepath = filedialog.asksaveasfilename(
            title="保存先を選択",
            defaultextension=".yaml" if mode == "yaml" else ".txt",
            initialfile=default_name,
            filetypes=filetypes
        )

        if filepath:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            messagebox.showinfo("成功", f"ファイルを保存しました:\n{filepath}")

    def clear_preview(self):
        """プレビューをクリア"""
        self.preview_text.delete('1.0', tk.END)
        self.save_content = ""


def main():
    root = tk.Tk()
    app = PromptClassifierGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
