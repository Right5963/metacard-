import yaml
import os

# 元のYAMLファイルを読み込み
with open('wildcards_raw_20250429.yaml', 'r', encoding='utf-8') as f:
    data = yaml.safe_load(f)

# 先頭のタグセットを取得
if 'originalsets' in data and len(data['originalsets']) > 0:
    # 新しいYAMLファイル構造を作成
    output = {
        'characterface': [
            ['pink hair', 'long hair', 'blue eyes', 'blonde hair', 'short hair'],
            ['brown hair', 'twin tails', 'green eyes', 'black hair', 'red eyes']
        ],
        'characterbody': [
            ['breasts', 'large breasts', 'medium breasts', 'small breasts', 'navel'],
            ['thighs', 'thick thighs', 'wide hips', 'collarbone', 'stomach']
        ],
        'clothing': [
            ['swimsuit', 'one-piece swimsuit', 'school swimsuit', 'competition swimsuit'],
            ['underwear', 'panties', 'white panties', 'bra', 'white bra']
        ],
        'poseemotion': [
            ['solo', 'looking at viewer', 'smile', 'closed mouth', 'standing'],
            ['sitting', 'lying', 'on back', 'on bed', 'blush']
        ],
        'angle': [
            ['from behind', 'from below', 'dutch angle', 'backlighting'],
            ['from above', 'from side', 'profile', 'depth of field']
        ],
        'backgrounds': [
            ['pool', 'poolside', 'water', 'beach', 'indoors'],
            ['outdoors', 'sky', 'blue sky', 'cloud', 'window']
        ],
        'style': [
            ['painterly', 'sketch', 'blurry', 'glitch', 'realistic'],
            ['simple background', 'blurry background', 'faux traditional media', 'identity censor']
        ],
        'sexual': [
            ['nipples', 'see-through', 'cameltoe', 'highleg', 'wet'],
            ['groin', 'cleavage', 'ass', 'ass focus', 'sideboob']
        ],
        'adult': [
            ['pussy', 'censored nipples', 'female pubic hair', 'pussy juice'],
            ['cum', 'cum on body', 'cum on breasts', 'masturbation', 'female masturbation']
        ],
        'other': [
            ['cowboy shot', 'hair between eyes', 'sidelocks', 'alternate costume', 'official alternate costume'],
            ['shiny clothes', 'skin tight', 'arms at sides', 'hands up', 'bare shoulders']
        ],
        'originalsets': data['originalsets'][:5]  # 最初の5セットだけ取得
    }

    # ファイルに書き込み
    with open('wildcards_categorized_sets_20250429.yaml', 'w', encoding='utf-8') as f:
        yaml.dump(output, f, default_flow_style=False, allow_unicode=True)

    print('セット形式のYAMLファイルを生成しました: wildcards_categorized_sets_20250429.yaml')
else:
    print('元のYAMLファイルに originalsets が見つからないか、空です')
