#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
キーワード辞書データベース
各カテゴリに属するキーワードを定義
"""

# 顔の特徴（髪型、目の色、髪色、目の形、唇など）
CHARACTERFACE_KEYWORDS = {
    # 髪型
    'long hair', 'short hair', 'medium hair', 'very long hair',
    'twin braids', 'braid', 'single braid', 'french braid',
    'ponytail', 'side ponytail', 'low ponytail', 'high ponytail',
    'twintails', 'twin tails',
    'bob cut', 'hime cut',
    'hair bun', 'double bun',
    'messy hair', 'disheveled hair',
    'drill hair', 'twin_drills', 'wavy hair', 'curly hair', 'straight hair',
    'pointy_hair', 'spiked_hair', 'ringlets',
    'hair_up', 'hair_down',
    'asymmetrical_hair', 'sidecut',
    'hair ornament', 'hair flower', 'hair ribbon', 'hair bow',
    'one side up', 'two side up',
    'bangs', 'blunt bangs', 'swept bangs', 'parted bangs', 'asymmetrical_bangs',
    'hair_over_one_eye', 'hair_between_eyes',
    'hair_flaps', 'sidelocks', 'hair_intakes',
    'blunt_ends', 'floating_hair', 'widow\'s_peak',
    'ahoge',

    # 髪色
    'blonde hair', 'black hair', 'brown hair', 'white hair',
    'silver hair', 'gray hair', 'grey hair',
    'red hair', 'pink hair', 'orange hair',
    'purple hair', 'blue hair', 'green hair',
    'multicolored hair', 'two-tone hair', 'gradient hair',

    # 目の色
    'blue eyes', 'red eyes', 'green eyes', 'brown eyes',
    'purple eyes', 'yellow eyes', 'orange eyes', 'pink eyes',
    'aqua eyes', 'grey eyes', 'black eyes',
    'heterochromia', 'multicolored eyes',

    # 目の形・特徴
    'sharp eyes', 'tareme', 'tsurime',
    'closed eyes', 'half-closed eyes',
    'slit pupils', 'heart-shaped pupils',
    'eyelashes', 'long eyelashes',
    'eyeshadow', 'eyeliner',

    # 唇（装飾）
    'lips', 'lipstick', 'lip gloss',

    # その他の顔の特徴
    'blush', 'nose blush',
    'freckles', 'mole', 'beauty mark',
    'makeup', 'light makeup', 'heavy makeup',
    'face paint', 'face markings',
}

# 服装（服、アクセサリー、靴、下着）
CLOTHING_KEYWORDS = {
    # トップス
    'shirt', 'white shirt', 'black shirt', 'blue shirt',
    'collared shirt', 'dress shirt',
    't-shirt', 'tank top', 'crop top',
    'sweater', 'cardigan', 'hoodie',
    'jacket', 'blazer', 'coat',
    'vest', 'waistcoat',
    'camisole',
    'sleeveless', 'sleeveless shirt',
    'open shirt',
    'sailor collar',

    # ボトムス
    'skirt', 'miniskirt', 'long skirt',
    'pleated skirt', 'plaid skirt', 'white skirt', 'black skirt', 'blue skirt',
    'pencil skirt',
    'plaid',
    'pants', 'jeans', 'shorts', 'short shorts',
    'leggings', 'stockings', 'thighhighs', 'pantyhose',
    'white thighhighs', 'lace-trimmed legwear',

    # ワンピース
    'dress', 'white dress', 'black dress',
    'blue dress', 'plaid dress', 'frilled dress',
    'sundress', 'evening dress',
    'sleeveless dress', 'long dress', 'short dress',

    # 制服・コスチューム
    'school uniform', 'serafuku', 'sailor uniform', 'sailor_dress',
    'gym uniform', 'gym_costume', 'track suit',
    'military_uniform', 'plugsuit',
    'baseball_uniform', 'basketball_uniform', 'tennis_uniform', 'soccer_uniform',
    'fast_food_uniform',
    'maid', 'maid outfit', 'maid dress',
    'maid headdress', 'maid apron',
    'nurse', 'nurse outfit',
    'kimono', 'yukata', 'baby_kimono',
    'chinese clothes', 'china dress', 'haori',

    # 職業・職業装束
    'miko', 'nun', 'priestess', 'priest',
    'witch', 'mage', 'wizard',
    'ninja', 'samurai',
    'waitress', 'office_lady', 'chef',
    'idol', 'magical_girl',
    'police', 'soldier', 'knight',
    'teacher', 'student', 'housewife',
    'slave', 'princess',
    'flight_attendant',

    # コスチューム
    'bunny_girl', 'playboy_bunny',
    'santa_costume', 'halloween_costume',
    'vampire_costume', 'ghost_costume',
    'superhero_costume', 'kigurumi',
    'alternate_costume',

    # 動物着ぐるみ
    'bear_costume', 'boar_costume', 'cat_costume', 'cow_costume',
    'dog_costume', 'monkey_costume', 'mouse_costume', 'panda_costume',
    'penguin_costume', 'pig_costume', 'rabbit_costume', 'reindeer_costume',
    'seal_costume', 'sheep_costume', 'tiger_costume',

    # 特殊装備・その他
    'tuxedo', 'tweed_outfit',
    'bikini_armor', 'armored_dress',
    'brand_uniform', 'leotard', 'pajamas',
    'cyber_fashion', 'cowboy_western',
    'biker_suit', 'racing_suit',

    # 水着・下着
    'bikini', 'swimsuit', 'one-piece swimsuit',
    'micro bikini', 'string bikini', 'side-tie bikini', 'side-tie bikini bottom',
    'bikini skirt', 'halter bikini', 'racing bikini',
    'highleg swimsuit',
    'tankini', 'sports bikini',
    'competition swimsuit', 'dress swimsuit', 'strapless swimsuit',
    'high-waisted swimsuit', 'polka dot swimsuit', 'striped swimsuit',
    'swim cap', 'sarong',
    'jammers', 'swim briefs', 'swim trunks', 'fundoshi', 'loincloth',
    'wetsuit', 'legskin',
    'underwear', 'bra', 'panties',
    'blue panties', 'aqua panties', 'bow panties', 'lace-trimmed panties',
    'white panties', 'white bra', 'black bra', 'lace-trimmed bra',
    'string panties',
    'lingerie', 'lace lingerie',
    'white bikini', 'blue bikini', 'pink bikini',
    'halterneck', 'o-ring', 'o-ring bikini',
    'front-tie top', 'front-tie bikini top',

    # アクセサリー
    'necklace', 'choker', 'collar',
    'detached collar',
    'earrings', 'bracelet', 'ring',
    'glasses', 'sunglasses',
    'hat', 'cap', 'beret',
    'scarf', 'necktie', 'bow', 'bowtie',
    'neck ribbon', 'blue ribbon', 'black ribbon', 'ribbon',
    'gloves', 'arm warmers', 'wristband',
    'garter straps', 'garter belt',
    'apron', 'waist apron', 'white apron', 'frilled apron',
    'lace trim',

    # 靴
    'shoes', 'boots', 'high heels', 'sandals',
    'sneakers', 'loafers',

    # 服の状態・動作
    'clothes lift', 'skirt lift', 'shirt lift', 'dress lift',
    'clothing_aside', 'clothing_pull', 'clothing_grab', 'clothing_open',
    'skirt_tug', 'panty_down', 'hood_down', 'buruma_pull',
    'strap_lift', 'strap_pull', 'strap_slip',
    'bra_lift', 'bra_pull',
    'shirt_tucked_in', 'shirt_partially_tucked_in', 'tucked_skirt',
    'untucked_shirt', 'button_gap', 'torn_clothes',
    'adjusting swimsuit', 'swimsuit aside', 'bikini bottom aside',
    'bikini top lift', 'one-piece swimsuit pull',
    'bikini bottom only', 'bikini top only',
    'hand under swimsuit', 'impossible swimsuit',
    'swimsuit under clothes',

    # 開けた状態
    'unbuttoned', 'unfastened', 'untied', 'unzipped', 'unzipping',
    'open_vest', 'open_collar', 'open_hoodie', 'open_jacket',
    'center_opening',

    # 露出・カットアウト
    'off_shoulder', 'single_off_shoulder', 'shoulder_cutout',
    'back_cutout', 'ass_cutout', 'cleavage_cutout', 'underboob_cutout',
    'clothing cutout',
    'backless_outfit', 'bare_back',
    'hip_vent', 'side_slit', 'pelvic_curtain', 'cross-laced_slit',

    # 袖
    'short_sleeves', 'long_sleeves',
    'sleeves_rolled_up', 'sleeves_past_wrists', 'sleeves_past_fingers',
    'low_cut_armhole',

    # 露出度高い服装
    'revealing_clothes', 'see-through_clothes', 'see-through', 'colorful_clothes',
    'breastless_clothes', 'breast_curtains', 'nippleless_clothes',
    'skinless_outfit', 'midriff_peek',
    'covered nipples', 'wet', 'wet clothes', 'open clothes',
    'bra visible through clothes',
    'wet shirt', 'wet swimsuit',
    'shiny clothes',

    # 着脱状態
    'naked', 'nude', 'topless',
    'bottomless', 'underwear_only',
    'skirt_around_one_leg', 'panty_around_one_leg', 'skirt_around_ankles',
    'no_panties', 'no_bra',

    # 特殊な着衣状態
    'naked_apron', 'naked_bandage', 'naked_chocolate',
    'naked_coat', 'naked_hoodie', 'naked_overalls',
    'naked_ribbon', 'naked_sheet', 'naked_shirt',
    'naked_suspenders', 'naked_tabard', 'naked_towel',

    # 胸元・下着関連
    'breast_slip', 'breast_out', 'nipple_slip', 'areola_slip',
    'skirt_slip', 'tented_shirt',

    # その他の状態
    'detached_clothes', 'zettai_ryouiki',

    # 服の破損・ダメージ（追加）
    'torn clothes', 'torn dress', 'torn skirt', 'torn swimsuit',

    # 露出状態（追加）
    'breasts out', 'cameltoe',

    # 帽子・頭部（追加）
    'witch hat', 'black headwear',

    # 上半身の服（追加）
    'corset', 'cape', 'capelet', 'black cape',
    'black leotard',

    # 下半身・パンツ（追加）
    'black panties', 'purple panties',

    # ドレス（追加）
    'purple dress',

    # 靴下・タイツ（追加）
    'black thighhighs', 'brown thighhighs',

    # ブーツ・靴（追加）
    'thigh boots', 'high heel boots',
    'black footwear', 'brown footwear',

    # 手袋・カフス（追加）
    'elbow gloves', 'wrist cuffs', 'bridal gauntlets',

    # 袖（追加）
    'detached sleeves', 'puffy sleeves', 'puffy short sleeves',

    # スタイル・デザイン（追加）
    'highleg', 'strapless', 'frills',

    # アクセサリー（追加）
    'hairclip', 'food-themed hair ornament', 'jewelry',

    # 柄・プリント（追加）
    'bat print', 'animal print', 'floral print',

    # コスチューム（追加）
    'halloween costume',
}

# ポーズ・表情・感情
POSEEMOTION_KEYWORDS = {
    # 基本ポーズ
    'standing', 'sitting', 'lying', 'kneeling',
    'crouching', 'squatting',
    'all fours', 'on stomach', 'on back',
    't-pose', 'a_pose', 'standing_at_attention', 'standing_on_one_leg',
    'kneel_up', 'on_one_knee', 'the_pose',
    'handstand', 'yoga',

    # 動的ポーズ
    'walking', 'running', 'jumping',
    'turning around', 'looking back', 'turning_head',
    'bent over', 'leaning forward', 'leaning back',
    'stretching', 'reaching', 'arms up',
    'arching back',
    'slouching', 'hunched_over', 'twisted_torso',
    'singing', 'dancing', 'bowing', 'tiptoes', 'heel_up', 'reclining',
    'crawling', 'acrobatic_pose', 'aerial', 'midair', 'falling', 'hopping',
    'fighting_stance', 'sword_guard_stance', 'ready_to_draw', 'battoujutsu_stance',
    'superhero_landing',

    # 座り方
    'sitting on chair', 'sitting on bed', 'sitting on floor',
    'wariza', 'seiza', 'cross-legged',
    'couple_sitting',
    'indian_style', 'butterfly_sitting', 'figure_four_sitting',
    'yokozuwari', 'lotus_position',
    'sitting_split', 'side_sitting_split', 'front_sitting_split',
    'sitting_on_person', 'sitting_on_lap', 'sitting_on_throne',
    'sitting_backwards', 'sitting_sideways', 'sidesaddle',
    'prostrate', 'prostration', 'dogeza', 'naked_dogeza',

    # 寝姿勢
    'lying on bed', 'lying on stomach', 'lying on back',
    'sleeping', 'eyes closed',
    'fetal_position', 'prone', 'on_side',
    'knee_up', 'knees_up',

    # 手・腕の位置
    'arms crossed', 'arms behind back', 'arms at sides',
    'hands_in_pockets', 'hands_at_sides',

    # 物を持つ
    'holding', 'holding_phone', 'holding_removed_eyewear',
    'holding_hand', "holding_another's_wrist",

    # 抱擁
    'hug', 'group_hug', 'hug_from_behind', 'imminent_hug',
    'hug_self', 'incoming_hug', 'mutual_hug', 'waist_hug', 'arm_hug',
    "hugging_another's_leg", 'hugging_own_legs',

    # つかむ
    'grabbing', 'arm_grab', 'ankle_grab', 'ass_grab',
    "grabbing_another's_breast", 'guided_breast_grab', "grabbing_another's_arm",
    'face_grab', "grabbing_another's_ass", "grabbing_another's_chin",
    "grabbing_another's_foot", "grabbing_another's_hand", "grabbing_another's_hip",
    'clothes_grab', 'curtain_grab', 'collar_grab', 'necktie_grab', 'sheet_grab',

    # 手を置く
    'hand on hip', 'hand on chest', 'hand on face',
    'hand_on_own_ear', "hand_on_another's_head", 'hand_on_own_head',
    'hand_on_own_forehead', "hand_on_another's_face", 'hand_on_own_face',
    "hand_on_another's_chin", 'hand_on_own_cheek', 'hand_on_own_chin',
    'hand_on_headwear', 'hand_on_upper_body',
    'hand_on_own_ass', 'hand_on_own_hips', 'hand_on_own_knees',
    'hand_between_legs',
    'hand_on_wall', 'against_wall', 'hand_on_glass', 'against_glass',

    # 指差し
    'pointing', 'pointing_at_another', 'pointing_at_self', 'pointing_at_viewer',
    'pointing_down', 'pointing_forward', 'pointing_up',
    'pointing_to_the_side', 'pointing_with_thumb',

    # 覆う
    'covering', 'covering_face', 'covering_own_eyes', "covering_another's_eyes",
    'covering_own_ears', 'covering_own_mouth', "covering_another's_mouth",
    'covering_breasts', 'covering_head', 'covering_crotch', 'covering_nipples',
    'hand bra',

    # 手を組む・握る
    'handshake', 'hands_together', 'interlocked_fingers', 'own_hands_clasped',
    'clenched_hands', 'clenched_hand',

    # 挨拶・合図
    'palm-fist_greeting', 'beckoning', 'waving_at_viewer',
    'salute', 'two-finger_salute', 'shrugging',
    'fist_bump', 'high_five',

    # 手のシェイプ・ジェスチャー
    'peace_sign', 'thumbs_up', 'v_fingers',
    'paw_pose', 'claw_pose', 'horns_pose', 'shadow_puppet',
    'heart_hands', 'heart_hands_duo', 'heart_hands_trio',
    'double_finger_gun', 'finger_frame', 'steepled_fingers', 'pretentious_gesture',

    # 手を差し出す・開く
    'outstretched_hand', 'offering_hand', 'open_hand', 'palm',
    'spread_arms', 'outstretched_arms', 'open_arms_for_viewer', 'cupping_hands',

    # 腕の位置バリエーション
    'arms_raised_in_the_air', 'arms_behind_head',
    'v_arms', 'w_arms', 'x_arms',
    'arm_behind_back', 'arm_up', 'arm_at_side',

    # 指の動作・位置
    'cracking_knuckles', 'between_fingers',
    'index_finger_raised', 'index_fingers_together', 'finger_counting',
    'put_aside_finger_on_cheek',

    # 特定の動作
    'raised_fist', 'relaxing', 'reaching_towards_viewer', 'shushing',
    'hidden_hands', 'detached_fingers',
    'adjusting_eyewear', 'covering_chest_by_hand',
    'leaning_on_person', 'curtsey', 'carry_me', 'fidgeting',

    # 特殊ポーズ
    'zombie_pose', 'gendou_pose', 'jojo_pose', 'konjou_pose',
    'sunrise_stance', 'victory_pose',
    'shyness_pose', 'djun_arms_pose', 'villain_pose', 'rabbit_pose',

    # その他の手の動作
    'facepalm', 'straddling_own_chin', 'kabedon', 'breasts_on_glass',

    # 頭の位置・動作
    'head_down', 'head_rest', 'arm_support', 'elbow_rest',
    'head_tilt', 'head_up',
    'cheek-to-cheek', 'heads_together', 'face-to-face',
    'cheek_poking', 'cheek_bulge', 'cheek_squash', 'cheek_pull',

    # 髪の動作
    'hairdressing', 'tying_hair', 'hand_in_own_hair', 'touching_hair',
    'hair_flip', 'hair_lift', 'hair_tucking', 'ruffling_hair',
    'hair_twirling', 'playing_with_own_hair', "playing_with_another's_hair",
    'kissing_hair', 'smelling_hair', 'biting_hair',
    "grabbing_another's_hair", 'braiding_hair', 'curling_own_hair',
    "brushing_another's_hair", 'braiding_own_hair', 'whipping_hair',

    # 脚の位置・組み方
    'legs crossed', 'legs apart', 'spread legs',
    'legs_together', 'crossed_legs', 'crossed_ankles',
    'knees_together_feet_apart', 'pigeon_toed',

    # 脚を上げる・動かす
    'leg_up', 'legs_up', 'knees_to_chest',
    'folded_legs', 'leg_lift', 'outstretched_leg',

    # 開脚・ストレッチ
    'standing_split', 'split',

    # 足の動作・位置
    'feet_up', 'plantar_flexion', 'dorsiflexion',
    'heel_up', 'tiptoes', 'stepping',

    # 足の特殊動作・インタラクション
    'tying_footwear', 'presenting_foot', 'spread_toes',
    'hands_on_feet', 'trampling', 'trample',
    'soaking_feet', 'tickling_feet',
    'foot_pussy', 'footjob_invitation', 'foot_worship',

    # 視線
    'looking at viewer', 'looking away', 'looking back',
    'looking down', 'looking up', 'looking_to_the_side',
    'facing_viewer', 'facing_away', 'facing_to_the_side', 'facing_another',
    'facing_down', 'facing_up', 'facing_back',

    # カメラアングル・視点
    'from above', 'from below', 'from behind', 'from side',
    'aerial view', "bird's eye view", "worm's eye view",
    'low angle', 'high angle', 'dutch angle', 'extreme angle', 'cinematic angle',
    'eye level', 'eyewear view',
    'pov', 'pov doorway',
    'straight-on', 'front view', 'back view', 'side view', 'three-quarter view',
    'over-the-shoulder shot', 'over the shoulder shot',
    'upside-down',

    # 構図・ショット
    'close-up', 'extreme close-up',
    'full body', 'upper body', 'lower body', 'cowboy shot',
    'portrait', 'profile', 'face only',
    'wide shot', 'long shot', 'extreme long shot', 'establishing shot',
    'panorama', 'overlooking panorama view',
    'scenic view', 'scenery', 'magnificent view',

    # 視覚効果・構図
    'vanishing point', 'perspective', 'extreme perspective', 'foreshortening',
    'symmetrical', 'rotational symmetry',
    'obliques', 'contrapposto',
    'multiple views', 'candid shot',

    # クロッピング
    'cropped', 'cropped legs', 'cropped torso', 'cropped arms', 'cropped shoulders',
    'cropped head', 'cropped neck',
    'head out of frame', 'feet out of frame',

    # 特殊アングル
    'upskirt', 'panty shot',

    # 表情
    'smile', 'grin', 'smirk', 'laughing', 'crazy laugh',
    'half smile', 'light smile', 'gloomy smile', 'sad smile',
    'nervous smile', 'evil smile', 'crazy smile', 'grinning smile',
    'big laugh', 'burst out laughing', 'giggling',
    'serious', 'angry', 'annoyed', 'rage', 'scowl', 'anger vein',
    'sad', 'crying', 'tears', 'sobbing',
    'tearing up', 'happy tears', 'streaming tears', 'wiping tears', 'tears from one eye',
    'floating tears', 'glowing tears',
    'crying with eyes open',
    'embarrassed', 'shy', 'blushing', 'bashful',
    'blush stickers', 'full-face blush', 'nose blush',
    'surprised', 'shocked',
    'nervous', 'worried', 'anxious', 'nervous sweating',
    'seductive', 'inviting', 'seductive smile',
    'playful', 'teasing', 'naughty face',
    'wet smile', 'smug',
    'bored', 'confused', 'disdain', 'disgusted',
    'disappointed', 'frustrated', 'regrettable',
    'determined', 'excited', 'exhausted',
    'expressionless', 'clear face', 'glaring', 'grimace',
    'yawn', 'drooling', 'drunk', 'envy', 'evil',
    'anguish', 'gloom', 'dark persona', 'yandere',
    'fangasm', 'flustered',

    # 顔・体の視覚効果
    'eyes_visible_through_hair',
    'armpit_focus',

    # 口の表情
    'open mouth', 'closed mouth',
    ':d',
    'pout', 'pursed lips', 'parted_lips',
    'teeth', 'fang', 'fang out', 'skin_fang', 'sharp_teeth', 'round_teeth', 'upper_teeth',
    'tongue', 'tongue_out', 'licking_tongue_out',
    'saliva', 'heavy breathing', 'moaning',
    'lip biting',
    'chevron_mouth', 'dot_mouth', 'heart-shaped_mouth',
    'rectangular_mouth', 'sideways_mouth', 'split_mouth',
    'square_mouth', 'triangle_mouth', 'wavy_mouth',
    'finger_to_mouth', 'hand_to_own_mouth', 'covering_own_mouth', 'mouth_hold',

    # 感情・状態
    'happy', 'joyful', 'excited',
    'tired', 'sleepy', 'exhausted',
    'confused', 'thinking',
    'confident', 'proud',
    'aroused', 'horny', 'in heat', 'sexual arousal',
    'orgasm', 'fucked silly', 'emotionless sex',

    # 特殊表情
    'ahegao', 'torogao', 'bedroom eyes', 'half-closed eyes',
    'wink', 'one eye closed',
    'rolling eyes', 'cross-eyed', 'upturned eyes', 'crazy eyes',
    'drunken eyes', 'heart eyes', 'heart-shaped pupils',

    # 口の動作・インタラクション
    'mouth_pull',
    'drink', 'eating',
    'kiss', 'after_kiss', 'blowing_kiss', 'french_kiss',
    'implied_kiss', 'imminent_kiss', 'incoming_kiss', 'indirect_kiss',
    'kiss_from_behind', 'pocky_kiss', 'cigarette_kiss', 'surprise_kiss', 'tiptoe_kiss',

    # incoming系インタラクション
    'incoming_attack', 'incoming_punch',
    'incoming_drink', 'incoming_food', 'incoming_gift',
    'fed_by_viewer',

    # 戦闘・アクション
    'fighting', 'duel', 'clash', 'sparks',
    'punching', 'kicking', 'high_kick', 'rapid_punches',
    'wrestling', 'slashing',
    'catfight', 'pillow_fight', 'snowball_fight',
    'holding_weapon', 'horse_riding',

    # 特殊効果・魔法
    'magic', 'energy', 'magic_circle', 'aura',
    'electrokinesis', 'telekinesis', 'psychic',
    'levitation', 'floating_clothes', 'floating_object',

    # その他
    'dynamic pose', 'motion lines',
    'stylish_pose', 'upside-down_face',

    # ポーズ（追加）
    'arms behind head', 'legs up', 'back',

    # 開脚系（追加）
    'spread pussy', 'spread anus', 'spread ass',

    # フォーカス（追加）
    'ass focus',

    # 表情（追加）
    'parted lips',

    # 性的動作（追加）
    'female masturbation', 'masturbation',
    'sex', 'sex from behind', 'vaginal',
    'oral', 'fellatio',
    'straddling', 'girl on top', 'cowgirl position', 'reverse cowgirl position',
    'standing sex', 'lifted by self',

    # 服の調整（追加）
    'adjusting clothes',
    'panties aside',

    # 挿入系（追加）
    'object insertion', 'vaginal object insertion', 'dildo riding',
}

# 背景・環境
BACKGROUNDS_KEYWORDS = {
    # 屋内
    'indoors', 'room', 'bedroom', 'living room',
    'bathroom', 'kitchen',
    'classroom', 'hallway', 'library',
    'office', 'studio',
    'hotel', 'hotel room', 'love hotel',
    'changing room', 'locker room',
    'gym', 'pool', 'swimming pool',

    # 屋外
    'outdoors', 'outside',
    'beach', 'ocean', 'sea', 'shore', 'sand', 'water',
    'park', 'garden', 'forest', 'tree',
    'palm tree', 'plant',
    'mountain', 'hill',
    'street', 'road', 'alley',
    'city', 'cityscape', 'urban',
    'building', 'house',
    'sky', 'blue sky', 'clouds', 'cloud', 'sunset', 'sunrise',
    'sunlight',
    'flower',

    # 時間帯
    'day', 'daytime',
    'night', 'nighttime',
    'dusk', 'dawn',

    # 天候
    'sunny', 'cloudy', 'cloudy sky', 'rain', 'raining',
    'snow', 'snowing',

    # 家具・小物
    'bed', 'bed sheet', 'pillow',
    'chair', 'desk', 'table',
    'window', 'curtains',
    'door', 'wall',
    'floor', 'wooden floor', 'carpet',

    # その他
    'on bed', 'on floor', 'on chair',
    'against wall',
    'simple background',
    'blurry', 'blurry background',
    'heart',

    # 天体・空（追加）
    'moon', 'full moon', 'night sky',

    # 自然（追加）
    'bare tree',

    # ハロウィン（追加）
    'halloween', 'jack-o\'-lantern', 'pumpkin', 'ghost',
    'spider web', 'silk',

    # 小道具（追加）
    'food', 'candy', 'halloween bucket',

    # 動物（追加）
    'bat (animal)',
}

# 体の特徴（体型、肌の色、胸など）
CHARACTERBODY_KEYWORDS = {
    # 年齢・性別
    'boy', 'girl', 'man', 'woman',
    'child', 'toddler', 'teenager',
    'student', 'university_student',
    'old_man', 'old_woman', 'mature_female', 'milf',
    'aged_down', 'aged_up',
    'age_difference',
    'shota', 'kemono', 'kemono_shota',

    # 体型
    'petite', 'slender', 'slim',
    'curvy', 'voluptuous',
    'muscular', 'toned',
    'tall', 'short',
    'thick thighs', 'wide hips',

    # 肌の色
    'pale skin', 'fair skin', 'light skin',
    'dark skin', 'tan', 'tanned',

    # 胸のサイズ
    'large breasts', 'huge breasts', 'gigantic breasts',
    'medium breasts', 'small breasts', 'flat chest',
    'cleavage', 'deep cleavage',

    # 胸の形状・特徴
    'breasts_apart', 'hanging_breasts', 'perky_breasts',
    'sagging_breasts', 'pointy_breasts', 'veiny_breasts',
    'unaligned_breasts', 'floating_breasts', 'bouncing_breasts',

    # 胸の動作・インタラクション
    'breast_hold', 'breast_lift', 'breasts_squeezed_together',
    'breast_suppress', 'groping', 'weighing_breasts',

    # 胸に関する状態・意識
    'breast_conscious', 'breast_envy',

    # 測定・その他
    'bust_chart', 'bust_measuring', 'flying_button', 'oversized_breast_cup',

    # 露出状態・裸体
    'completely_nude', 'nude_female', 'nude_male',
    'clothed_female', 'clothed_male',
    'topless_female', 'topless_male',
    'bottomless_female', 'bottomless_male',

    # 露出部位
    'bare_arms', 'bare_shoulders', 'bare_legs',
    'backboob', 'sideboob', 'underboob',
    'pectorals',

    # その他身体部位
    'navel', 'midriff', 'stomach',
    'covered navel',
    'armpits', 'collarbone',
    'thighs', 'legs', 'thigh gap',
    'feet', 'barefoot', 'toes',
    'ass', 'butt', 'ass visible through thighs',
    'testicles', 'erection',
    'groin',
    'skindentation',
    'uvula', 'long tongue', 'dark tongue',

    # 特殊
    'wings', 'tail', 'horns',
    'animal ears', 'cat ears', 'dog ears',
    'elf ears', 'pointy ears',

    # 人数・性別（追加）
    '1girl', '1boy', 'solo', 'solo focus', 'hetero',

    # 体の主要部位（追加）
    'breasts', 'nipples', 'pussy', 'anus', 'penis',

    # 体の状態・分泌物（追加）
    'sweat', 'sweaty', 'sweatdrop', 'flying sweatdrops',
    'sweaty clothes', 'sparkling sweat', 'wiping sweat', 'very sweaty',
    'spoken sweatdrop',
    'pussy juice', 'shiny', 'shiny skin',
    'partially visible vulva', 'female ejaculation',
    'pubic hair', 'female pubic hair', 'male pubic hair',
}

# カテゴリマッピング
CATEGORY_KEYWORDS = {
    'characterface': CHARACTERFACE_KEYWORDS,
    'clothing': CLOTHING_KEYWORDS,
    'poseemotion': POSEEMOTION_KEYWORDS,
    'backgrounds': BACKGROUNDS_KEYWORDS,
    'characterbody': CHARACTERBODY_KEYWORDS,
}

def get_all_keywords():
    """全キーワードを取得"""
    return CATEGORY_KEYWORDS

def get_category_keywords(category):
    """特定カテゴリのキーワードを取得"""
    return CATEGORY_KEYWORDS.get(category, set())
