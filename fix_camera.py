import os
import glob
import re

files = glob.glob('src/**/*.tsx', recursive=True)

import_stmt = "import { PermissionsAndroid, Platform } from 'react-native';"

def ensure_imports(content):
    if 'PermissionsAndroid' not in content:
        # Find the first react-native import and add PermissionsAndroid to it
        if "from 'react-native';" in content:
            content = re.sub(r"(import\s+\{[^}]*?)(\}\s+from\s+'react-native';)", r"\1, PermissionsAndroid, Platform \2", content)
        else:
            content = import_stmt + '\n' + content
    return content

helper_fn = """
const requestCameraPermission = async () => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: "Camera Permission",
          message: "App needs camera permission to take photos",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK"
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  }
  return true;
};
"""

for f in files:
    with open(f, 'r') as file:
        content = file.read()
    if 'launchCamera(' in content and 'requestCameraPermission' not in content:
        content = ensure_imports(content)
        # add the helper function before the first functional component or at the end of imports
        # A simple way is to add it after the last import
        import_end = content.rfind('import ')
        if import_end != -1:
            end_of_line = content.find('\n', import_end)
            content = content[:end_of_line+1] + '\n' + helper_fn + '\n' + content[end_of_line+1:]
        
        # replace launchCamera( with await requestCameraPermission() check
        # Since launchCamera is used inside functions like openCamera, we need to make sure the function is async.
        # But launchCamera uses callbacks, so we can just do:
        # requestCameraPermission().then(granted => { if(granted) { launchCamera(...) } })
        
        replacement = """requestCameraPermission().then(granted => {
      if (granted) {
        launchCamera("""
        
        content = content.replace("launchCamera(", replacement)
        # we need to close the bracket and brace after launchCamera's callback closes.
        # This is tricky with simple string replace.
        
        # Let's use regex to find launchCamera(..., (response) => { ... })
        # Actually, it's safer to just do:
        
        pass

