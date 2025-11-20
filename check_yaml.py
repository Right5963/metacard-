import yaml

file_path = r'C:\metacard\wildcards_light_merged_20250526.yaml'

with open(file_path, 'r', encoding='utf-8') as f:
    data = yaml.safe_load(f)

# character_main エントリを確認
print('character_main:')
print(data.get('character_main', 'なし'))
print('\n最初の5つのカテゴリ:')
for key in list(data.keys())[:5]:
    print(f"- {key}")

# エントリ数を表示
print('\nカテゴリごとのエントリ数:')
for key in data:
    print(f"- {key}: {len(data[key])}")
