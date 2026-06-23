import os
import re

ext_file = "node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/gamma/helpers/UIManagerHelperExt.kt"
with open(ext_file, "w") as f:
    f.write("""package com.swmansion.rnscreens.gamma.helpers

import com.facebook.react.bridge.UIManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.common.UIManagerType

internal fun getFabricUIManagerNotNull(reactContext: ThemedReactContext): UIManager =
    checkNotNull(UIManagerHelper.getUIManager(reactContext, UIManagerType.FABRIC)) {
        "[RNScreens] UIManager must not be null"
    }
""")

files_to_patch = [
    "node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/gamma/scrollviewmarker/ScrollViewMarker.kt",
    "node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/gamma/tabs/host/TabsHost.kt"
]

for filepath in files_to_patch:
    if not os.path.exists(filepath):
        continue
    with open(filepath, "r") as file:
        content = file.read()
    
    # Add import if missing
    if "import com.swmansion.rnscreens.gamma.helpers.getFabricUIManagerNotNull" not in content:
        content = content.replace(
            "import com.facebook.react.uimanager.UIManagerHelper",
            "import com.facebook.react.uimanager.UIManagerHelper\nimport com.swmansion.rnscreens.gamma.helpers.getFabricUIManagerNotNull"
        )
    
    # Use regex to match multi-line "UIManagerHelper   .  getFabricUIManagerNotNull("
    content = re.sub(r"UIManagerHelper\s*\.\s*getFabricUIManagerNotNull\(", "getFabricUIManagerNotNull(", content)
    
    with open(filepath, "w") as file:
        file.write(content)
