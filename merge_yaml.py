import yaml
import sys
import os
from datetime import datetime

def load_yaml(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        try:
            return yaml.safe_load(f)
        except yaml.YAMLError as e:
            print(f"エラー: {file_path}の読み込み中にエラーが発生しました: {e}")
            sys.exit(1)

def merge_yaml_files(file1, file2, output_file=None):
    # YAMLファイルを読み込む
    yaml1 = load_yaml(file1)
    yaml2 = load_yaml(file2)

    # マージ結果を格納する辞書
    merged = {}

    # character_mainエントリを特別に処理
    character_main = ["1girl, solo, __characterface__, __characterbody__, __clothing__, __poseemotion__, __angle__, __backgrounds__, __style__, __sexual__, __uncategorized__"]
    merged['character_main'] = character_main

    # 両方のファイルに存在するすべてのキーを収集
    all_keys = set(yaml1.keys()) | set(yaml2.keys())
    all_keys.discard('character_main')  # character_mainは既に処理したので除外

    # 各キーについて処理
    for key in all_keys:
        # 両方のファイルにキーが存在する場合はリストをマージ
        if key in yaml1 and key in yaml2:
            if isinstance(yaml1[key], list) and isinstance(yaml2[key], list):
                # 重複を除外してマージ
                merged[key] = yaml1[key] + [item for item in yaml2[key] if item not in yaml1[key]]
        # キーがfile1にのみ存在する場合
        elif key in yaml1:
            merged[key] = yaml1[key]
        # キーがfile2にのみ存在する場合
        elif key in yaml2:
            merged[key] = yaml2[key]

    # 出力ファイル名を生成
    if output_file is None:
        current_date = datetime.now().strftime("%Y%m%d")
        output_file = f"wildcards_light_{current_date}アダルトらいと.yaml"

    # 結果を書き込む
    with open(output_file, 'w', encoding='utf-8') as f:
        yaml.dump(merged, f, allow_unicode=True, sort_keys=False)

    print(f"マージ完了！出力ファイル: {output_file}")
    return output_file

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("使用方法: python merge_yaml.py <file1> <file2> [output_file]")
        sys.exit(1)

    file1 = sys.argv[1]
    file2 = sys.argv[2]

    output_file = sys.argv[3] if len(sys.argv) > 3 else None

    merge_yaml_files(file1, file2, output_file)
