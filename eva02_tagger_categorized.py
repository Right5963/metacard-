#!/usr/bin/env python

import os
import sys
import argparse
import glob
import json
import numpy as np
from PIL import Image
import onnxruntime as ort
from tqdm import tqdm
import pandas as pd
import requests
from pathlib import Path

# タグのカテゴリ分類定義
TAG_CATEGORIES = {
    "face": {
        "hairstyle": ["long_hair", "short_hair", "straight_hair", "curly_hair", "wavy_hair", "ponytail",
                     "twin_tails", "braid", "bangs", "side_ponytail", "twintails", "messy_hair", "hime_cut"],
        "hair_color": ["blonde_hair", "silver_hair", "white_hair", "brown_hair", "black_hair", "blue_hair",
                      "pink_hair", "red_hair", "purple_hair", "green_hair", "orange_hair", "grey_hair",
                      "aqua_hair", "colored_inner_hair", "multicolored_hair", "gradient_hair"],
        "eye_color": ["blue_eyes", "red_eyes", "brown_eyes", "green_eyes", "purple_eyes", "yellow_eyes",
                      "pink_eyes", "black_eyes", "aqua_eyes", "heterochromia", "grey_eyes", "orange_eyes",
                      "multicolored_eyes"],
        "face_features": ["freckles", "mole", "glasses", "eyepatch", "beauty_mark", "small_face", "beautiful_face",
                         "cute_face", "makeup", "lipstick", "earrings", "blush", "face_tattoo"]
    },
    "body": {
        "body_type": ["small_breasts", "medium_breasts", "large_breasts", "huge_breasts", "petite", "tall",
                      "short", "curvy", "slender", "flat_chest", "muscular", "plump", "skinny", "thin"],
        "age": ["loli", "child", "teenage", "mature", "milf", "young", "old", "adolescent", "adult"],
        "skin": ["pale_skin", "dark_skin", "tanned", "white_skin", "olive_skin", "tan_lines", "gyaru",
                "deep_skin", "fair_skin", "wet", "sweat", "sweating"],
        "other": ["tattoo", "scar", "birthmark", "navel", "navel_piercing", "piercing", "tareme",
                 "tsurime", "wide_hips", "narrow_waist"]
    },
    "clothing": {
        "top": ["shirt", "blouse", "t-shirt", "sweater", "jacket", "cardigan", "coat", "tank_top", "blazer",
               "hoodie", "crop_top", "bustier", "tube_top", "vest", "sweatshirt", "jersey", "uniform_top",
               "sports_bra", "volleyball_uniform", "sports_uniform", "gym_uniform", "wet_clothes"],
        "underwear": ["panties", "bra", "lingerie", "underwear", "bikini", "swimsuit", "thong", "sports_bra",
                     "see-through", "bikini_top", "bikini_bottom", "micro_bikini"],
        "bottom": ["skirt", "pants", "jeans", "shorts", "leggings", "stockings", "thighhighs", "pantyhose",
                  "miniskirt", "pleated_skirt", "short_shorts", "hot_pants", "bloomers", "bike_shorts",
                  "gym_shorts", "spats", "buruma", "tight_shorts", "sports_shorts"],
        "full_body": ["dress", "uniform", "school_uniform", "sailor_uniform", "suit", "kimono", "yukata",
                      "negligee", "naked", "nude", "topless", "maid_uniform", "business_suit", "swimsuit",
                      "competition_swimsuit", "school_swimsuit", "bodysuit", "gym_uniform", "sports_uniform",
                      "volleyball_uniform", "athlete", "wet_clothes"],
        "footwear": ["shoes", "high_heels", "boots", "sandals", "barefoot", "sneakers", "knee_boots",
                    "thigh_boots", "socks", "knee_socks", "ankle_socks", "geta", "flip-flops", "sports_shoes"],
        "accessories": ["hat", "ribbon", "hairpin", "necklace", "earrings", "bracelet", "ring", "tiara",
                        "crown", "hairband", "hair_ribbon", "hair_bow", "choker", "gloves", "belt", "scarf",
                        "necktie", "bowtie", "sweatband", "wristband", "headband"]
    },
    "pose": {
        "basic": ["standing", "sitting", "lying", "kneeling", "squatting", "leaning", "arched_back",
                 "all_fours", "bent_forward", "bent_knee", "crossed_legs", "fetal_position"],
        "hands": ["hand_on_hip", "hand_up", "hands_clasped", "finger_pointing", "v", "peace_sign", "thumbs_up",
                 "hand_on_own_chest", "hand_on_own_face", "hand_on_own_thigh", "hand_in_hair", "hand_on_headphones",
                 "arms_up", "arms_raised", "hands_up", "hands_on_head"],
        "body": ["arms_behind_back", "arms_crossed", "bent_over", "on_back", "on_side", "spread_arms",
                "spread_legs", "legs_up", "legs_crossed", "back-to-back", "back-to-viewer", "on_stomach", "stretching"],
        "complex": ["fighting_stance", "running", "walking", "jumping", "dancing", "falling", "floating",
                   "flying", "swimming", "balancing", "crouching", "upside-down", "seiza", "selfie", "curtsy",
                   "sports", "volleyball", "playing_sports", "exercise", "exercising", "volleyball_position"]
    },
    "emotion": {
        "expression": ["smile", "grin", "laughing", "serious", "angry", "sad", "crying", "embarrassed",
                      "surprised", "scared", "flustered", "expressionless", "smug", "grin", "annoyed",
                      "nervous", "worried", "determined", "evil_smile", "crazy", "disgusted", "confused",
                      "happy", "excited", "cheerful"],
        "mouth": ["open_mouth", "closed_mouth", "parted_lips", "pout", "licking_lips", "tongue_out", "clenched_teeth",
                 "drooling", "lipstick", "fangs", "food_on_mouth", "mouth_hold"],
        "eyes": ["wide_eyes", "half-closed_eyes", "closed_eyes", "wink", "tears", "heart-shaped_pupils",
                "glowing_eyes", "empty_eyes", "hidden_eyes", "rolling_eyes", "bloodshot_eyes", "blank_eyes"],
        "other": ["blush", "nose_blush", "sweat", "nosebleed", "steam", "anger_vein", "fang", "teardrop"]
    },
    "background": {
        "location": ["indoors", "outdoors", "bathroom", "bedroom", "kitchen", "classroom", "office", "beach",
                    "forest", "city", "park", "garden", "school", "library", "cafe", "restaurant", "onsen",
                    "hospital", "rooftop", "street", "alley", "train", "subway", "shop", "stage",
                    "gym", "gymnasium", "volleyball_court", "sports_field", "stadium", "arena", "court",
                    "locker_room", "sports_hall", "dojo"],
        "time": ["day", "night", "sunset", "sunrise", "dusk", "dawn", "morning", "afternoon", "evening", "twilight"],
        "weather": ["rain", "snow", "cloudy", "sunny", "windy", "clear_sky", "cloudy_sky", "fog", "lightning",
                   "rainbow", "aurora", "storm", "blizzard"],
        "objects": ["bed", "chair", "table", "desk", "couch", "window", "door", "bookshelf", "lamp", "plant",
                   "flowers", "tree", "computer", "phone", "book", "pillow", "blanket", "curtain", "rug", "mirror",
                   "volleyball", "volleyball_net", "sports_equipment", "ball", "net", "bench", "bleachers",
                   "scoreboard", "sports_ball", "sports_net", "fitness_equipment", "weights", "simple_background",
                   "black_background", "white_background", "colored_background"]
    },
    "angle": {
        "viewpoint": ["from_above", "from_below", "from_side", "from_behind", "from_front", "overhead_view",
                     "pov", "side_view", "top_view", "bottom_view", "ground_view", "profile"],
        "distance": ["close-up", "wide_shot", "medium_shot", "extreme_close-up", "full_body", "upper_body",
                    "lower_body", "head_only", "head_and_shoulders", "waist_up"],
        "focus": ["looking_at_viewer", "looking_away", "looking_back", "looking_up", "looking_down", "looking_to_the_side",
                 "looking_at_another", "eye_contact", "as_viewer", "gaze", "direct_gaze", "averted_gaze"],
        "camera": ["dutch_angle", "fisheye", "depth_of_field", "bokeh", "lens_flare", "motion_blur", "panorama",
                  "telephoto", "wide-angle", "macro", "night_vision", "filters", "monochrome", "sepia", "vignette",
                  "greyscale", "black_and_white", "high_contrast", "chromatic_aberration", "dynamic_angle"]
    },
    "other": {
        "character": ["1girl", "multiple_girls", "solo", "solo_focus", "couple", "group", "crowd", "1boy",
                     "multiple_boys", "no_humans", "chibi", "monster_girl", "kemonomimi", "magical_girl", "mecha_musume"],
        "setting": ["fantasy", "sci-fi", "modern", "historical", "futuristic", "medieval", "cyberpunk",
                   "steampunk", "post-apocalyptic", "contemporary", "surreal", "retro", "victorian", "sports",
                   "athletic", "school_life", "slice_of_life"],
        "quality": ["masterpiece", "best_quality", "high_quality", "illustration", "painting", "drawing",
                   "sketch", "anime", "manga", "digital_art", "traditional_media", "watercolor", "oil_painting"],
        "misc": ["food", "drink", "animal", "plant", "weapon", "vehicle", "technology", "magic", "fire",
                "water", "earth", "wind", "light", "darkness", "space", "sky", "nature", "urban", "wet",
                "moist", "sweat", "sweating", "sports", "exercise", "athlete", "athletic", "text_focus",
                "text", "logo", "watermark", "signature", "general", "dark", "questionable", "explicit",
                "safe", "nsfw", "sfw"]
    }
}

# カテゴリのフラット化
CATEGORY_MAP = {}
for main_cat, sub_cats in TAG_CATEGORIES.items():
    for sub_cat, tags in sub_cats.items():
        for tag in tags:
            CATEGORY_MAP[tag] = (main_cat, sub_cat)

def download_model(model_dir):
    """モデルとCSVファイルをダウンロードする"""
    print("wd-eva02-large-v3モデルをダウンロードします...")
    os.makedirs(model_dir, exist_ok=True)

    model_path = os.path.join(model_dir, "model.onnx")
    csv_path = os.path.join(model_dir, "selected_tags.csv")

    # HuggingFaceの認証問題を回避するため、別のダウンロード方法を試みる
    model_url = "https://huggingface.co/SmilingWolf/wd-eva02-large-tagger-v3/resolve/main/model.onnx"  # 正しいURL
    csv_url = "https://huggingface.co/SmilingWolf/wd-eva02-large-tagger-v3/raw/main/selected_tags.csv"  # 正しいCSV URL

    try:
        # モデルのダウンロード（大きいファイルなので進捗表示）
        if not os.path.exists(model_path):
            print(f"モデルをダウンロード中: {model_url}")
            response = requests.get(model_url, stream=True)
            response.raise_for_status()

            total_size = int(response.headers.get('content-length', 0))
            block_size = 1024  # 1KB
            progress_bar = tqdm(total=total_size, unit='iB', unit_scale=True)

            with open(model_path, 'wb') as f:
                for data in response.iter_content(block_size):
                    progress_bar.update(len(data))
                    f.write(data)
            progress_bar.close()

            if total_size != 0 and progress_bar.n != total_size:
                print("モデルのダウンロードが完了しませんでした")
                return False
        else:
            print(f"モデルは既に存在します: {model_path}")

        # CSVファイルのダウンロード
        if not os.path.exists(csv_path):
            print(f"タグ定義をダウンロード中: {csv_url}")
            response = requests.get(csv_url)
            response.raise_for_status()

            with open(csv_path, 'wb') as f:
                f.write(response.content)
        else:
            print(f"タグ定義は既に存在します: {csv_path}")

    except Exception as e:
        print(f"ダウンロード中にエラーが発生しました: {e}")
        return False

    print("ダウンロードが完了しました")
    return True

def categorize_tags(tags_with_scores):
    """タグをカテゴリに分類する"""
    categorized = {
        "face": {
            "hairstyle": [],
            "hair_color": [],
            "eye_color": [],
            "face_features": []
        },
        "body": {
            "body_type": [],
            "age": [],
            "skin": [],
            "other": []
        },
        "clothing": {
            "top": [],
            "underwear": [],
            "bottom": [],
            "full_body": [],
            "footwear": [],
            "accessories": []
        },
        "pose": {
            "basic": [],
            "hands": [],
            "body": [],
            "complex": []
        },
        "emotion": {
            "expression": [],
            "mouth": [],
            "eyes": [],
            "other": []
        },
        "background": {
            "location": [],
            "time": [],
            "weather": [],
            "objects": []
        },
        "angle": {
            "viewpoint": [],
            "distance": [],
            "focus": [],
            "camera": []
        },
        "other": {
            "character": [],
            "setting": [],
            "quality": [],
            "misc": []
        },
        "uncategorized": []
    }

    for tag, score in tags_with_scores:
        tag_lower = tag.lower()
        if tag_lower in CATEGORY_MAP:
            main_cat, sub_cat = CATEGORY_MAP[tag_lower]
            categorized[main_cat][sub_cat].append((tag, score))
        else:
            # タグがカテゴリに見つからない場合は未分類に追加
            categorized["uncategorized"].append((tag, score))

    return categorized

def tag_images(img_dir, output_dir, model_dir, threshold=0.35, categorize=False):
    """画像にタグを付ける"""
    # モデルとタグ定義の確認
    model_path = os.path.join(model_dir, "model.onnx")
    csv_path = os.path.join(model_dir, "selected_tags.csv")

    if not os.path.exists(model_path) or not os.path.exists(csv_path):
        print("モデルファイルまたはタグ定義が見つかりません。")
        if not download_model(model_dir):
            return False

    # 出力ディレクトリを作成
    os.makedirs(output_dir, exist_ok=True)

    # タグ情報を読み込む
    print("タグ定義を読み込み中...")
    df = pd.read_csv(csv_path)
    labels = df['name'].tolist()

    # モデルをロード
    print("モデルをロード中...")
    try:
        session = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])
    except Exception as e:
        print(f"モデルのロード中にエラーが発生しました: {e}")
        return False

    # 画像ファイルを検索
    print("画像ファイルを検索中...")
    extensions = ['jpg', 'jpeg', 'png', 'webp', 'bmp']
    image_files = []
    for ext in extensions:
        image_files.extend(glob.glob(os.path.join(img_dir, f"*.{ext}")))
        image_files.extend(glob.glob(os.path.join(img_dir, f"*.{ext.upper()}")))

    if not image_files:
        print(f"ディレクトリ {img_dir} に画像ファイルが見つかりません")
        return False

    print(f"合計 {len(image_files)} 個の画像ファイルを処理します")

    # 各画像を処理
    for img_path in tqdm(image_files, desc="タグ付け中"):
        try:
            # 画像の読み込み
            img = Image.open(img_path).convert('RGB')

            # デバッグ情報（処理前）
            print(f"処理中の画像: {img_path}, サイズ: {img.size}, モード: {img.mode}")

            # リサイズ - LANCZOSを使用して高品質なリサイズ
            img = img.resize((448, 448), resample=Image.LANCZOS)

            # 画像の品質確認のため、最初の画像はデバッグ用に保存
            if os.path.basename(img_path) == os.path.basename(image_files[0]):
                debug_dir = os.path.join(output_dir, "debug")
                os.makedirs(debug_dir, exist_ok=True)
                base_debug = os.path.splitext(os.path.basename(img_path))[0]
                img.save(os.path.join(debug_dir, f"{base_debug}_resized.jpg"))

            # 前処理
            img_array = np.array(img).astype(np.float32) / 255.0
            # モデルに合わせた入力形式に変換
            img_array = np.expand_dims(img_array, axis=0)  # (H,W,C) -> (1,H,W,C)

            # モデルのインプット形状を確認して必要があれば調整
            input_shape = session.get_inputs()[0].shape
            # 最初の画像のみ形状をデバッグ出力
            if os.path.basename(img_path) == os.path.basename(image_files[0]):
                print(f"入力配列の形状: {img_array.shape}")
                print(f"モデルの期待する入力形状: {input_shape}")

            # 必要に応じて形状を調整
            if len(input_shape) == 4 and input_shape[1] == 448 and input_shape[3] == 3:
                # これは (batch_size, 448, 448, 3) の形状を期待しています - 既に正しい形状
                pass
            elif len(input_shape) == 4 and input_shape[1] == 3 and input_shape[2] == 448 and input_shape[3] == 448:
                # これは (batch_size, 3, 448, 448) の形状を期待しています - CHW形式に変換
                img_array = np.transpose(img_array, (0, 3, 1, 2))  # (1,H,W,C) -> (1,C,H,W)
                if os.path.basename(img_path) == os.path.basename(image_files[0]):
                    print(f"形状を変換: {img_array.shape}")
            else:
                print(f"警告: 未知の入力形状 {input_shape}、デフォルト処理を試みます")

            # 推論
            input_name = session.get_inputs()[0].name
            output_name = session.get_outputs()[0].name
            probs = session.run([output_name], {input_name: img_array})[0]

            # 結果をタグと確率のペアにする
            tags_with_scores = [(labels[i], float(probs[0][i])) for i in range(len(labels)) if probs[0][i] >= threshold]
            tags_with_scores.sort(key=lambda x: x[1], reverse=True)

            # ベースネーム取得
            base_name = os.path.splitext(os.path.basename(img_path))[0]

            # タグをカテゴリ分類するかどうか
            if categorize:
                # カテゴリ分類
                categorized_tags = categorize_tags(tags_with_scores)

                # JSONとして保存
                json_path = os.path.join(output_dir, f"{base_name}_categorized.json")
                with open(json_path, 'w', encoding='utf-8') as f:
                    json.dump(categorized_tags, f, ensure_ascii=False, indent=2)

                # 読みやすいテキスト形式でも保存
                txt_path = os.path.join(output_dir, f"{base_name}.txt")
                with open(txt_path, 'w', encoding='utf-8') as f:
                    # まず未分類の全タグを出力
                    for tag, score in tags_with_scores:
                        f.write(f"{tag}, {score:.6f}\n")

                    f.write("\n--- カテゴリ別タグ ---\n\n")

                    # カテゴリごとに出力
                    for main_cat, sub_cats in categorized_tags.items():
                        if main_cat == "uncategorized":
                            if categorized_tags["uncategorized"]:
                                f.write(f"■ 未分類:\n")
                                for tag, score in categorized_tags["uncategorized"]:
                                    f.write(f"  - {tag}, {score:.6f}\n")
                            continue

                        f.write(f"■ {main_cat}:\n")
                        for sub_cat, tags in sub_cats.items():
                            if tags:
                                f.write(f"  ● {sub_cat}:\n")
                                for tag, score in tags:
                                    f.write(f"    - {tag}, {score:.6f}\n")
            else:
                # 通常のテキスト形式で保存
                txt_path = os.path.join(output_dir, f"{base_name}.txt")
                with open(txt_path, 'w', encoding='utf-8') as f:
                    for tag, score in tags_with_scores:
                        f.write(f"{tag}, {score:.6f}\n")

        except Exception as e:
            print(f"エラー ({img_path}): {e}")

    print("タグ付けが完了しました")
    return True

def main():
    parser = argparse.ArgumentParser(description='EVA02モデルを使用して画像にタグを付け、カテゴリ分類する')
    parser.add_argument('--dir', required=True, help='画像ファイルのディレクトリ')
    parser.add_argument('--out', required=True, help='出力ディレクトリ')
    parser.add_argument('--model_dir', default='./tagger_data', help='モデルファイルのディレクトリ')
    parser.add_argument('--threshold', type=float, default=0.35, help='タグ検出の閾値')
    parser.add_argument('--categorize', action='store_true', help='タグをカテゴリ分類するかどうか')
    args = parser.parse_args()

    # 画像にタグを付ける
    success = tag_images(args.dir, args.out, args.model_dir, args.threshold, args.categorize)

    if success:
        print(f"処理が完了しました。タグは {args.out} に保存されました。")
        return 0
    else:
        print("処理中にエラーが発生しました。")
        return 1

if __name__ == "__main__":
    sys.exit(main())
