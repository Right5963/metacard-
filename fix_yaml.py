import yaml

file_path = r'c:\Users\user\AppData\Roaming\StabilityMatrix\Packages\Stable Diffusion WebUI reForge\extensions\sd-dynamic-prompts\wildcards\yahoo\wildcards_light_20250518アダルトらいと.yaml'

with open(file_path, 'r', encoding='utf-8') as f:
    data = yaml.safe_load(f)

# character_main エントリを追加/上書き
data['character_main'] = ['1girl, solo, __characterface__, __characterbody__, __clothing__, __poseemotion__, __angle__, __backgrounds__, __style__, __sexual__, __uncategorized__']

# YAMLの順序を整理するために一時辞書を作成
ordered_data = {}
ordered_data['character_main'] = data.pop('character_main')

# 残りのキーを追加
for key in data:
    ordered_data[key] = data[key]

# 修正したデータを書き込み
with open(file_path, 'w', encoding='utf-8') as f:
    yaml.dump(ordered_data, f, allow_unicode=True, sort_keys=False)

print('character_main エントリを追加し、順序を修正しました')
