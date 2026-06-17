import os

replacements = [
    ('Principal', 'Director'),
    ('principal', 'director'),
    ('HM', 'Principal'),
    ('hm', 'principal'),
    ('Hm', 'Principal'),
    ('hM', 'principal'),
    ('Head Master', 'Principal')
]

text_extensions = {'.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.txt', '.css', '.scss'}

def replace_in_file(file_path):
    _, ext = os.path.splitext(file_path)
    if ext.lower() not in text_extensions:
        return False
        
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        return False
    
    new_content = content
    for old, new in replacements:
        new_content = new_content.replace(old, new)
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

targets = ['src', 'App.tsx', 'index.js']

modified_count = 0
for target in targets:
    if os.path.isfile(target):
        if replace_in_file(target):
            modified_count += 1
    elif os.path.isdir(target):
        for root, dirs, files in os.walk(target):
            for file in files:
                file_path = os.path.join(root, file)
                if replace_in_file(file_path):
                    modified_count += 1

print(f"Modified {modified_count} files.")
