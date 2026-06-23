import os
import re

screens_dir = 'src/screens'
for root, _, files in os.walk(screens_dir):
    for file in files:
        if file.endswith('.tsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                content = f.read()

            if 'borderBottomLeftRadius' in content and ('ChevronLeft' in content or 'ArrowLeft' in content or 'goBack' in content):
                print(f"File: {filepath}")
