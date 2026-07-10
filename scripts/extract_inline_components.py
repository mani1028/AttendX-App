#!/usr/bin/env python3
"""Extract inline React.FC components from screen files into component folder."""
from __future__ import annotations

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCREENS = os.path.join(ROOT, "src", "screens")

TARGETS = [
    "src/screens/visitor/VisitorDashboardScreen.tsx",
    "src/screens/principal/PaymentEntryScreen.tsx",
    "src/screens/principal/DataExportScreen.tsx",
    "src/screens/teacher/LeaveRequestScreen.tsx",
    "src/screens/accountant/StaffAttendanceScreen.tsx",
    "src/screens/director/RenewalPaymentScreen.tsx",
    "src/screens/principal/SettingsScreen.tsx",
    "src/screens/teacher/TeacherFaceReviewScreen.tsx",
]

ROLE_MAP = {
    "teacher": "teacher", "principal": "principal", "student": "student",
    "director": "director", "accountant": "accountant", "admin": "admin",
    "visitor": "visitor", "public": "public", "common": "common", "auth": "auth",
}


def pascal_to_camel(name: str) -> str:
    return name[0].lower() + name[1:] if name else name


def count_lines(path: str) -> int:
    with open(path, encoding="utf-8") as f:
        return sum(1 for _ in f)


def comp_dir_for(screen_path: str) -> str:
    rel = os.path.relpath(screen_path, SCREENS)
    role = rel.split(os.sep)[0]
    base = os.path.basename(screen_path).replace("Screen.tsx", "")
    return os.path.join(ROOT, "src", "components", ROLE_MAP.get(role, role), pascal_to_camel(base))


def extract_components(content: str) -> tuple[list[tuple[str, str]], str]:
    """Extract const Name: React.FC blocks before export default."""
    export_m = re.search(r"\nexport default function", content)
    if not export_m:
        export_m = re.search(r"\nconst \w+ = \(\) =>", content)
    if not export_m:
        return [], content

    head = content[: export_m.start()]
    tail = content[export_m.start() :]
    components: list[tuple[str, str]] = []
    remaining: list[str] = []

    pattern = re.compile(
        r"^// .+\n|^const ([A-Z]\w+): React\.FC[\s\S]*?^\};\n",
        re.MULTILINE,
    )

    pos = 0
    while pos < len(head):
        m = re.search(r"^const ([A-Z]\w+): React\.FC", head[pos:], re.MULTILINE)
        if not m:
            remaining.append(head[pos:])
            break
        start = pos + m.start()
        remaining.append(head[pos:start])
        # find end of component
        i = start
        depth = 0
        started = False
        while i < len(head):
            if head[i] == "{":
                depth += 1
                started = True
            elif head[i] == "}":
                depth -= 1
                if started and depth == 0:
                    # find trailing );
                    end = head.find("};", i) + 2
                    comp_name = m.group(1)
                    comp_body = head[start:end]
                    components.append((comp_name, comp_body))
                    pos = end
                    break
            i += 1
        else:
            break

    new_head = "".join(remaining)
    return components, new_head + tail


def process(screen_rel: str) -> None:
    screen_path = os.path.join(ROOT, screen_rel)
    if not os.path.exists(screen_path):
        return
    before = count_lines(screen_path)
    with open(screen_path, encoding="utf-8") as f:
        content = f.read()

    components, new_content = extract_components(content)
    if not components:
        print(f"No components in {screen_rel} ({before} lines)")
        return

    comp_dir = comp_dir_for(screen_path)
    os.makedirs(comp_dir, exist_ok=True)
    folder = os.path.basename(comp_dir)
    styles_name = f"{folder}Styles"
    rel_import = os.path.relpath(comp_dir, os.path.dirname(screen_path)).replace("\\", "/")

    exports = []
    imports_for_screen = []

    for name, body in components:
        out_path = os.path.join(comp_dir, f"{name}.tsx")
        file_content = (
            "import React from 'react';\n"
            f"import {{ {styles_name} as styles }} from './{styles_name}';\n"
            f"{body}\n\nexport default {name};\n"
        )
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(file_content)
        exports.append(f"export {{ default as {name} }} from './{name}';")
        imports_for_screen.append(name)

    # add imports to screen
    import_block = f"import {{ {', '.join(imports_for_screen)} }} from '{rel_import}';\n"
    if import_block not in new_content:
        lines = new_content.splitlines(keepends=True)
        last_import = 0
        for idx, line in enumerate(lines):
            if line.startswith("import "):
                last_import = idx + 1
        lines.insert(last_import, import_block)
        new_content = "".join(lines)

    with open(screen_path, "w", encoding="utf-8") as f:
        f.write(new_content)

    index_path = os.path.join(comp_dir, "index.ts")
    existing = ""
    if os.path.exists(index_path):
        with open(index_path, encoding="utf-8") as f:
            existing = f.read()
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(existing.rstrip() + "\n" + "\n".join(exports) + "\n")

    after = count_lines(screen_path)
    print(f"{screen_rel}: {before} -> {after} ({len(components)} components)")


def main() -> int:
    for t in TARGETS:
        process(t)
    return 0


if __name__ == "__main__":
    sys.exit(main())
