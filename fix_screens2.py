import os
import re

dir_path = "node_modules/react-native-screens/src/fabric"
for root, _, files in os.walk(dir_path):
    for f in files:
        if not f.endswith(".ts"):
            continue
        filepath = os.path.join(root, f)
        with open(filepath, "r") as file:
            content = file.read()

        # Fix Readonly<{}> in DirectEventHandler
        content = re.sub(r"CT\.DirectEventHandler<Readonly<{}>>", r"CT.DirectEventHandler<null>", content)

        with open(filepath, "w") as file:
            file.write(content)

