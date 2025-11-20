import argparse
from pathlib import Path
from collections import Counter
from create_wildcards_yaml_all import categorize_tags, read_tags_from_file


def parse_args():
    p = argparse.ArgumentParser(description="未分類タグを再分類し、割り振り候補を表示")
    p.add_argument("--input", "-i", required=True, help="入力ディレクトリ")
    return p.parse_args()


def load_all_tags(input_dir):
    files = sorted(Path(input_dir).glob("*.txt"))
    all_tags = Counter()
    for fp in files:
        tags = read_tags_from_file(fp)
        for t in tags:
            all_tags[t] += 1
    return all_tags


def main():
    args = parse_args()
    all_tags = load_all_tags(args.input)
    categorized = categorize_tags(all_tags)

    # set of all categorized tags (except other)
    categorized_union = set().union(*[v for k, v in categorized.items() if k != "other"])
    uncategorized = {t: c for t, c in all_tags.items() if t not in categorized_union}

    print(f"未分類タグ数: {len(uncategorized)}")
    # 試しにキーワード再走査: スペース→アンダースコア
    mapping = {"angle": categorized["angle"],
               "pose": categorized["pose"],
               "emotion": categorized["emotion"],
               "character_face": categorized["character_face"],
               "character_body": categorized["character_body"],
               "clothing": categorized["clothing"],
               "background": categorized["background"]}

    reassigned = {}
    for tag, cnt in list(uncategorized.items()):
        tag_norm = tag.lower().replace(" ", "_")
        for cat, tagset in mapping.items():
            for ref in tagset:
                ref_norm = ref.lower().replace(" ", "_")
            # ここではパターンマッチせずスキップ
        # 省略
    # とりあえず未分類上位表示
    for tag, cnt in sorted(uncategorized.items(), key=lambda x: x[1], reverse=True)[:100]:
        print(f"{tag}: {cnt}")

if __name__ == "__main__":
    main()
