#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import glob
import argparse
import json
import numpy as np
import pandas as pd
from PIL import Image
import onnxruntime as ort
from tqdm import tqdm
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

# タグカテゴリ定義（タグのグループ分け）
TAG_CATEGORIES = {
    "character": {
        "gender": ["1girl", "1boy", "multiple_girls", "multiple_boys", "male", "female"],
        "age": ["loli", "shota", "child", "young", "teen", "old", "middle_aged", "age_difference"],
        "species": ["animal_ears", "fox_girl", "cat_girl", "dog_girl", "monster_girl", "elf", "fairy", "angel", "demon", "alien"],
        "hair_color": ["blonde_hair", "brown_hair", "black_hair", "blue_hair", "pink_hair", "purple_hair", "green_hair", "red_hair", "silver_hair", "white_hair", "orange_hair", "aqua_hair", "grey_hair"],
        "hair_style": ["long_hair", "short_hair", "twintails", "drill_hair", "ponytail", "blunt_bangs", "braided_hair", "side_ponytail", "twin_braids", "messy_hair", "hair_bun", "straight_hair", "wavy_hair", "curly_hair", "drill_hair", "hime_cut"]
    },
    "clothing": {
        "upper_body": ["shirt", "blouse", "t-shirt", "tank_top", "bra", "bikini_top", "crop_top", "sweater", "cardigan", "jacket", "coat", "hoodie", "uniform", "dress_shirt", "suit"],
        "lower_body": ["skirt", "pants", "jeans", "shorts", "bloomers", "bikini_bottom", "pantyhose", "leggings", "thighhighs", "kneehighs", "stockings", "panties"],
        "full_body": ["dress", "robe", "pajamas", "kimono", "swimsuit", "bodysuit", "naked", "nude", "naked_apron", "school_uniform", "serafuku", "business_suit", "suit", "wedding_dress", "lingerie"],
        "footwear": ["shoes", "boots", "sneakers", "high_heels", "sandals", "barefoot", "loafers"],
        "accessories": ["hat", "hairband", "glasses", "sunglasses", "mask", "scarf", "jewelry", "necklace", "earrings", "ring", "bracelet", "gloves", "ribbon", "hairpin"]
    },
    "position": {
        "standing": ["standing", "standing_on_one_leg"],
        "sitting": ["sitting", "sitting_on_chair", "sitting_on_bed", "sitting_on_floor", "seiza", "cross-legged", "wariza"],
        "lying": ["lying", "on_back", "on_side", "on_stomach", "lying_on_bed", "lying_on_ground"],
        "other": ["kneeling", "squatting", "bent_over", "against_wall", "all_fours", "doggy_style", "upside-down", "arms_behind_back", "spread_legs", "leaning_forward", "leaning_back"]
    },
    "body": {
        "breasts": ["small_breasts", "medium_breasts", "large_breasts", "huge_breasts", "flat_chest", "cleavage", "breast_hold", "bouncing_breasts"],
        "hips": ["wide_hips", "small_hips", "big_ass", "small_ass", "ass", "from_behind"],
        "general": ["slim", "fat", "muscular", "chubby", "skinny", "athletic", "tan_line", "pale_skin", "dark_skin", "fit"]
    },
    "facial": {
        "eyes": ["blue_eyes", "red_eyes", "brown_eyes", "green_eyes", "purple_eyes", "yellow_eyes", "pink_eyes", "black_eyes", "heterochromia", "aqua_eyes", "orange_eyes", "grey_eyes"],
        "expression": ["smile", "grin", "laughing", "happy", "sad", "crying", "tears", "angry", "annoyed", "frown", "surprised", "shocked", "embarrassed", "blush", "expressionless", "nervous", "smug", "confident", "wink", "pout", "sigh"],
        "mouth": ["open_mouth", "closed_mouth", "tongue_out", "licking_lips", "kissing", "clenched_teeth", "fangs", "drooling"]
    },
    "background": {
        "location": ["outdoors", "indoors", "bathroom", "bedroom", "kitchen", "classroom", "office", "beach", "forest", "city", "ruins", "sky", "space", "garden", "street", "train", "subway", "flower_field", "school"],
        "time": ["day", "night", "sunset", "sunrise", "dusk", "dawn"],
        "weather": ["rain", "snow", "sunny", "cloudy", "storm", "lightning", "windy", "foggy", "aurora"],
        "elements": ["water", "ocean", "river", "flowers", "grass", "trees", "mountains", "clouds", "stars", "moon", "sun", "rainbow"]
    },
    "meta": {
        "quality": ["highres", "absurdres", "incredibly_absurdres", "lowres", "bad_quality", "jpeg_artifacts", "artifact"],
        "artist": ["official_art", "fanart", "artist_name", "signature", "watermark"],
        "source": ["original", "alternate_costume", "alternate_universe", "official_alternate_costume", "parody", "crossover", "cropped"],
        "style": ["photorealistic", "realistic", "sketch", "anime", "manga", "chibi", "comic", "monochrome", "colorful", "traditional_media", "digital_media", "3d", "pixel_art", "watercolor", "oil_painting"]
    },
    "composition": {
        "view": ["profile", "from_above", "from_below", "from_side", "from_behind", "looking_at_viewer", "looking_away", "looking_back", "looking_down", "looking_up"],
        "angle": ["wide_angle", "close-up", "extreme_close-up", "panorama", "fisheye", "depth_of_field", "bokeh"],
        "shot": ["full_body", "upper_body", "lower_body", "head_only", "face", "feet", "hands", "focus_on_face", "focus_on_breasts", "focus_on_ass"]
    },
    "action": {
        "general": ["running", "walking", "jumping", "fighting", "dancing", "singing", "reading", "writing", "eating", "drinking", "sleeping", "swimming", "flying", "falling", "floating", "posing"],
        "interaction": ["hugging", "holding_hands", "kissing", "headpat", "handshake", "carrying", "piggyback", "princess_carry", "lap_pillow"]
    },
    "nsfw": {
        "general": ["nsfw", "nude", "nipples", "pussy", "sex", "censored", "uncensored", "topless", "naked", "underwear", "see-through", "pantsu", "panty_peek", "no_bra", "clothed", "exhibitionism"],
        "actions": ["masturbation", "fingering", "breast_grab", "ass_grab", "spread_legs", "spread_pussy", "sex", "handjob", "footjob", "blowjob", "paizuri", "facial", "cum", "cum_inside", "cum_on_body", "bukkake"]
    }
}

def download_model(model_dir="tagger_data"):
    """モデルとCSVファイルをダウンロード"""
    import requests
    import zipfile
    from tqdm import tqdm
    import shutil

    # ディレクトリが存在しなければ作成
    os.makedirs(model_dir, exist_ok=True)

    # モデルパスとCSVパスを定義
    model_path = os.path.join(model_dir, "model.onnx")
    csv_path = os.path.join(model_dir, "selected_tags.csv")

    # モデルのURLとCSVのURL
    model_url = "https://civitai.com/api/download/models/30312"  # eva02-v2 ONNX
    csv_url = "https://github.com/SmilingWolf/SW-CV-ModelZoo/raw/main/tag_list.csv"

    # モデルとCSVをダウンロード
    if not os.path.exists(model_path):
        print(f"モデルをダウンロード中: {model_url}")
        try:
            response = requests.get(model_url, stream=True)
            total_size = int(response.headers.get('content-length', 0))

            with open(model_path, 'wb') as f, tqdm(
                desc="モデルダウンロード中",
                total=total_size,
                unit='B',
                unit_scale=True,
                unit_divisor=1024,
            ) as bar:
                for data in response.iter_content(chunk_size=1024):
                    size = f.write(data)
                    bar.update(size)
            print(f"モデルをダウンロードしました: {model_path}")
        except Exception as e:
            print(f"モデルのダウンロード中にエラーが発生しました: {e}")
            return False

    if not os.path.exists(csv_path):
        print(f"タグリストをダウンロード中: {csv_url}")
        try:
            response = requests.get(csv_url)
            with open(csv_path, 'wb') as f:
                f.write(response.content)
            print(f"タグリストをダウンロードしました: {csv_path}")
        except Exception as e:
            print(f"タグリストのダウンロード中にエラーが発生しました: {e}")
            return False

    return True

def preprocess_image(img_path, target_size=(448, 448)):
    """画像を読み込み、前処理を行う"""
    # 画像の読み込み
    img = Image.open(img_path).convert('RGB')

    # 高品質なリサイズ（LANCZOS法を使用）
    img_resized = img.resize(target_size, resample=Image.LANCZOS)

    # NumPy配列に変換
    img_array = np.array(img_resized).astype(np.float32) / 255.0

    # バッチ次元を追加 (1, H, W, C)
    img_array = np.expand_dims(img_array, axis=0)

    return img_array, img.size

def batch_preprocess_images(image_paths, target_size=(448, 448), batch_size=8):
    """画像のバッチを前処理する"""
    batch_arrays = []
    original_sizes = []

    for i in range(0, len(image_paths), batch_size):
        batch_paths = image_paths[i:i+batch_size]
        batch_data = []
        batch_sizes = []

        # 各画像を並列で処理
        with ThreadPoolExecutor(max_workers=min(8, len(batch_paths))) as executor:
            futures = {executor.submit(preprocess_image, path, target_size): path for path in batch_paths}
            for future in as_completed(futures):
                img_array, original_size = future.result()
                batch_data.append(img_array[0])  # バッチ次元を削除して追加
                batch_sizes.append(original_size)

        # バッチに積み重ねる
        if batch_data:
            batch_array = np.stack(batch_data)
            batch_arrays.append(batch_array)
            original_sizes.extend(batch_sizes)

    return batch_arrays, original_sizes

def categorize_tags(tags_with_scores):
    """タグをカテゴリ分類する"""
    categorized = {
        "character": {},
        "clothing": {},
        "position": {},
        "body": {},
        "facial": {},
        "background": {},
        "meta": {},
        "composition": {},
        "action": {},
        "nsfw": {},
        "uncategorized": []
    }

    # 各タグについて
    for tag, score in tags_with_scores:
        tag_found = False

        # 各カテゴリをチェック
        for main_cat, sub_cats in TAG_CATEGORIES.items():
            if tag_found:
                break

            # 各サブカテゴリをチェック
            for sub_cat, tags in sub_cats.items():
                if tag in tags:
                    # サブカテゴリが存在しなければ作成
                    if sub_cat not in categorized[main_cat]:
                        categorized[main_cat][sub_cat] = []

                    # タグをカテゴリに追加
                    categorized[main_cat][sub_cat].append((tag, score))
                    tag_found = True
                    break

        # 未分類のタグ
        if not tag_found:
            categorized["uncategorized"].append((tag, score))

    return categorized

def tag_images(img_dir, output_dir, model_dir="tagger_data", threshold=0.35, categorize=True, batch_size=8, use_gpu=True):
    """画像にタグを付ける"""
    # 出力ディレクトリを作成
    os.makedirs(output_dir, exist_ok=True)

    # モデルとCSVが存在するか確認
    model_path = os.path.join(model_dir, "model.onnx")
    csv_path = os.path.join(model_dir, "selected_tags.csv")

    if not os.path.exists(model_path) or not os.path.exists(csv_path):
        print(f"必要なファイルがありません。ダウンロードします...")
        if not download_model(model_dir):
            return False

    # タグ情報を読み込む
    print(f"タグ定義を読み込み中... {csv_path}")
    df = pd.read_csv(csv_path)
    labels = df['name'].tolist()
    print(f"タグ数: {len(labels)}")

    # ONNXランタイムセッションの作成
    providers = ['CUDAExecutionProvider', 'CPUExecutionProvider'] if use_gpu else ['CPUExecutionProvider']
    session_options = ort.SessionOptions()
    session_options.enable_profiling = False
    session_options.enable_mem_pattern = True
    session_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

    print(f"モデルをロード中... {model_path}")
    try:
        session = ort.InferenceSession(model_path, sess_options=session_options, providers=providers)
    except Exception as e:
        print(f"モデルのロード中にエラーが発生しました。CPUモードで再試行します: {e}")
        session = ort.InferenceSession(model_path, sess_options=session_options, providers=['CPUExecutionProvider'])

    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name
    input_shape = session.get_inputs()[0].shape
    print(f"モデルの入力形状: {input_shape}")

    # 画像ファイルの検索
    extensions = ["jpg", "jpeg", "png", "webp", "bmp"]
    image_files = []

    for ext in extensions:
        image_files.extend(glob.glob(os.path.join(img_dir, f"*.{ext}")))
        image_files.extend(glob.glob(os.path.join(img_dir, f"*.{ext.upper()}")))

    if not image_files:
        print(f"ディレクトリ {img_dir} に画像ファイルが見つかりません")
        return False

    print(f"合計 {len(image_files)} 個の画像ファイルを処理します")

    # バッチ処理の準備
    batch_arrays, original_sizes = batch_preprocess_images(image_files, batch_size=batch_size)

    # 各バッチを処理
    results = []
    start_time = time.time()

    for i, batch_array in enumerate(tqdm(batch_arrays, desc="バッチ処理中")):
        batch_paths = image_files[i*batch_size:(i+1)*batch_size]

        # 入力形状の調整（NCHW形式に変換が必要な場合）
        if len(input_shape) == 4 and input_shape[1] == 3:
            # NHWC -> NCHW
            batch_array = np.transpose(batch_array, (0, 3, 1, 2))

        # バッチ推論
        try:
            probs = session.run([output_name], {input_name: batch_array})[0]

            # 各画像の結果を処理
            for j, (img_path, prob) in enumerate(zip(batch_paths, probs)):
                # タグと確率をペアにする
                tags_with_scores = [(labels[k], float(prob[k])) for k in range(len(labels)) if prob[k] >= threshold]
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

                            if isinstance(sub_cats, dict) and sub_cats:  # サブカテゴリが存在し空でない場合
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

                results.append((img_path, len(tags_with_scores)))

        except Exception as e:
            print(f"バッチ処理中にエラーが発生しました: {e}")

    # 処理統計の表示
    elapsed_time = time.time() - start_time
    images_per_second = len(image_files) / elapsed_time

    print(f"\n処理完了:")
    print(f"- 処理画像数: {len(image_files)}")
    print(f"- 合計時間: {elapsed_time:.2f}秒")
    print(f"- 処理速度: {images_per_second:.2f}画像/秒")

    # 最大、最小、平均タグ数の計算
    if results:
        tag_counts = [count for _, count in results]
        avg_tags = sum(tag_counts) / len(tag_counts)
        min_tags = min(tag_counts)
        max_tags = max(tag_counts)

        print(f"- 平均タグ数: {avg_tags:.1f}")
        print(f"- 最小タグ数: {min_tags}")
        print(f"- 最大タグ数: {max_tags}")

    print(f"\nタグ付けが完了しました。結果は {output_dir} に保存されました。")
    return True

def main():
    parser = argparse.ArgumentParser(description='EVA02モデルを使用して画像にタグを付け、カテゴリ分類する強化版')
    parser.add_argument('--dir', default='downloaded_images', help='画像ファイルのディレクトリ')
    parser.add_argument('--out', default='tagged_results', help='出力ディレクトリ')
    parser.add_argument('--model_dir', default='tagger_data', help='モデルファイルのディレクトリ')
    parser.add_argument('--threshold', type=float, default=0.35, help='タグ検出の閾値')
    parser.add_argument('--categorize', action='store_true', help='タグをカテゴリ分類するかどうか', default=True)
    parser.add_argument('--batch_size', type=int, default=1, help='バッチサイズ（GPUメモリに注意）')
    parser.add_argument('--cpu', action='store_true', help='CPUのみを使用する')
    args = parser.parse_args()

    # 画像にタグを付ける
    success = tag_images(
        args.dir,
        args.out,
        args.model_dir,
        args.threshold,
        args.categorize,
        args.batch_size,
        use_gpu=not args.cpu
    )

    if success:
        print(f"処理が完了しました。タグは {args.out} に保存されました。")
        return 0
    else:
        print("処理中にエラーが発生しました。")
        return 1

if __name__ == "__main__":
    sys.exit(main())
