#!/usr/bin/env python3
"""Safely extract StyleSheet blocks from oversized screens."""
from __future__ import annotations

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCREENS = os.path.join(ROOT, "src", "screens")
COMPONENTS = os.path.join(ROOT, "src", "components")
SKIP = {
    "teacherQuestionPapers",
    "principalRegistrationPublic",
}

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


def extract_styles(content: str) -> tuple[str | None, str]:
    m = re.search(r"\nconst styles = StyleSheet\.create\(\{", content)
    if not m:
        return None, content
    start = m.start() + 1
    depth = 0
    i = m.end() - 1
    while i < len(content):
        if content[i] == "{":
            depth += 1
        elif content[i] == "}":
            depth -= 1
            if depth == 0:
                end = content.find(");", i) + 2
                return content[start:end], content[:start].rstrip() + "\n"
        i += 1
    return None, content


def screen_info(screen_path: str) -> tuple[str, str, str]:
    rel = os.path.relpath(screen_path, SCREENS)
    role = rel.split(os.sep)[0]
    base = os.path.basename(screen_path).replace("Screen.tsx", "")
    folder = pascal_to_camel(base)
    comp_dir = os.path.join(COMPONENTS, ROLE_MAP.get(role, role), folder)
    return comp_dir, folder, f"{folder}Styles"


def rel_import(screen_path: str, comp_dir: str) -> str:
    return os.path.relpath(comp_dir, os.path.dirname(screen_path)).replace("\\", "/")


def process(screen_path: str) -> tuple[int, int]:
    comp_dir, folder, styles_name = screen_info(screen_path)
    if folder in SKIP:
        return count_lines(screen_path), count_lines(screen_path)

    with open(screen_path, encoding="utf-8") as f:
        content = f.read()

    before = content.count("\n") + 1
    styles_block, content = extract_styles(content)
    if not styles_block:
        return before, before

    os.makedirs(comp_dir, exist_ok=True)
    styles_path = os.path.join(comp_dir, f"{styles_name}.ts")
    theme_depth = len(os.path.relpath(styles_path, COMPONENTS).split(os.sep))
    theme_import = "../" * theme_depth + "theme/tokens"

    with open(styles_path, "w", encoding="utf-8") as f:
        f.write(
            "import { StyleSheet } from 'react-native';\n"
            f"import {{ Theme }} from '{theme_import}';\n\n"
            f"export const {styles_name} = {styles_block.replace('const styles = ', '')}\n"
        )

    imp = rel_import(screen_path, comp_dir)
    import_line = f"import {{ {styles_name} as styles }} from '{imp}/{styles_name}';\n"

    if import_line not in content:
        # insert after last import
        lines = content.splitlines(keepends=True)
        last_import = 0
        for idx, line in enumerate(lines):
            if line.startswith("import "):
                last_import = idx + 1
        lines.insert(last_import, import_line)
        content = "".join(lines)

    content = re.sub(r"import \{([^}]*)\bStyleSheet\b([^}]*)\} from 'react-native';", _strip_stylesheet, content)
    content = re.sub(r",\s*StyleSheet", "", content)
    content = re.sub(r"StyleSheet,\s*", "", content)

    with open(screen_path, "w", encoding="utf-8") as f:
        f.write(content)

    index_path = os.path.join(comp_dir, "index.ts")
    export_line = f"export {{ {styles_name} }} from './{styles_name}';\n"
    if os.path.exists(index_path):
        with open(index_path, encoding="utf-8") as f:
            idx_content = f.read()
        if export_line not in idx_content:
            with open(index_path, "a", encoding="utf-8") as f:
                f.write(export_line)
    else:
        with open(index_path, "w", encoding="utf-8") as f:
            f.write(export_line)

    after = count_lines(screen_path)
    return before, after


def _strip_stylesheet(m: re.Match) -> str:
    before, after = m.group(1), m.group(2)
    parts = [p.strip() for p in (before + after).split(",") if p.strip()]
    if not parts:
        return ""
    return f"import {{ {', '.join(parts)} }} from 'react-native';"


def main() -> int:
    results = []
    for dp, _, fs in os.walk(SCREENS):
        for f in fs:
            if not f.endswith("Screen.tsx"):
                continue
            p = os.path.join(dp, f)
            if count_lines(p) > 600:
                before, after = process(p)
                results.append((before, after, p))

    still = sum(1 for _, a, _ in results if a > 600)
    print(f"Extracted styles from {len(results)} screens; {still} still over 600")
    for b, a, p in sorted(results, key=lambda x: -x[0]):
        print(f"  {'OK' if a <= 600 else '  '}: {b:4d} -> {a:4d}  {os.path.relpath(p, ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
