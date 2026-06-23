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

        # Ensure DirectEventHandler is imported cleanly
        if "import type" in content and "CodegenTypes" in content:
            if "react-native/Libraries/Types/CodegenTypes" not in content:
                content = "import type { Float, Int32, Double, DirectEventHandler, WithDefault } from 'react-native/Libraries/Types/CodegenTypes';\n" + content
            else:
                if "DirectEventHandler" not in content:
                    content = content.replace("Double }", "Double, DirectEventHandler }")
                if "WithDefault" not in content:
                    content = content.replace("DirectEventHandler }", "DirectEventHandler, WithDefault }")

        # Collect local string-literal union type aliases
        type_aliases = {}
        lines = content.split('\n')
        i = 0
        while i < len(lines):
            m = re.match(r'^(?:export\s+)?type\s+(\w+)\s*=\s*(.*)', lines[i])
            if m:
                name = m.group(1)
                value = m.group(2).strip()
                while ';' not in value and i + 1 < len(lines):
                    i += 1
                    value += ' ' + lines[i].strip()
                value = value.rstrip(';').strip()
                value = re.sub(r'^\s*\|\s*', '', value)
                if re.match(r"^'[^']*'(?:\s*\|\s*'[^']*')*$", value):
                    type_aliases[name] = value
            i += 1

        def replace_with_default(match):
            type_val = match.group(1).strip()
            default_val = match.group(2).strip()
            if type_val in type_aliases:
                resolved = type_aliases[type_val]
            elif type_val in ("boolean",):
                resolved = "boolean"
            elif type_val in ("CT.Float", "float"):
                resolved = "Float"
            elif type_val in ("CT.Int32", "int32"):
                resolved = "Int32"
            elif type_val in ("CT.Double", "Double", "double"):
                resolved = "Double"
            elif type_val in ("string",):
                resolved = "string"
            else:
                resolved = "string"
            return f"WithDefault<{resolved}, {default_val}>"

        content = re.sub(r"CT\.WithDefault<([^,]+),\s*([^>]+)>", replace_with_default, content)

        # Remove unused CT import reference entirely
        content = re.sub(
            r"import type \{[^}]*CodegenTypes as CT[^}]*\} from 'react-native/Libraries/Components/View/ViewPropTypes';",
            "",
            content,
        )
        # Clean up empty import blocks left behind
        content = re.sub(r"import type \{\s*\} from '[^']+';", "", content)
        content = re.sub(r"import \{\s*\} from '[^']+';", "", content)

        content = content.replace("CT.Float", "Float")
        content = content.replace("CT.Int32", "Int32")
        content = content.replace("CT.Double", "Double")

        content = re.sub(r"\|\s*null", "", content)
        content = re.sub(r"\|\s*undefined", "", content)
        content = re.sub(r"^\s*\|\s*$", "", content, flags=re.MULTILINE)

        content = content.replace("CT.DirectEventHandler", "DirectEventHandler")

        # FIX TSTypeReference UnsafeMixed errors
        content = re.sub(r"CT\.UnsafeMixed\[\]", "ReadonlyArray<string>", content)
        content = re.sub(r"UnsafeMixed<[^>]+>", "string", content)

        # FIX StringLiteralUnionTypeAnnotation in events
        content = re.sub(r"environment:\s*'regular'\s*\|\s*'inline'", "environment: string", content)

        with open(filepath, "w") as file:
            file.write(content)
