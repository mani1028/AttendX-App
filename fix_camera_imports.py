import os
import glob
import re

files = glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/**/*.ts', recursive=True)

for f in files:
    with open(f, 'r') as file:
        content = file.read()
    
    if 'launchCamera' in content and 'react-native-image-picker' in content:
        # We need to change import { ..., launchCamera } from 'react-native-image-picker'
        # Or just replace `launchCamera` with `launchCameraWithPermission`
        # And add import for it.
        
        # Calculate relative path to utils/cameraUtils
        # Since files are in src/screens/X, utils is at ../../utils/cameraUtils
        # or src/components/X -> ../utils/cameraUtils
        depth = f.count('/') - 1
        rel_path = '../' * depth + 'utils/cameraUtils'
        
        # Change `launchCamera` import to not import it from react-native-image-picker
        content = re.sub(r'(\s*,\s*launchCamera|\s*launchCamera\s*,\s*)', r'', content)
        # What if it's the only import? import { launchCamera } from 'react-native-image-picker'
        content = re.sub(r"import\s*\{\s*launchCamera\s*\}\s*from\s*'react-native-image-picker'\s*;\n?", "", content)
        
        # Import our helper
        helper_import = f"import {{ launchCameraWithPermission as launchCamera }} from '{rel_path}';\n"
        
        # Insert import after the last import
        import_end = content.rfind('import ')
        if import_end != -1:
            end_of_line = content.find('\n', import_end)
            content = content[:end_of_line+1] + helper_import + content[end_of_line+1:]
        else:
            content = helper_import + content
            
        with open(f, 'w') as file:
            file.write(content)
        print(f"Updated {f}")

