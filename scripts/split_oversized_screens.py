#!/usr/bin/env python3
"""Extract styles, types, helpers from oversized screens into component folders."""
from __future__ import annotations

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCREENS = os.path.join(ROOT, "src", "screens")
COMPONENTS = os.path.join(ROOT, "src", "components")

ROLE_MAP = {
    "teacher": "teacher",
    "principal": "principal",
    "student": "student",
    "director": "director",
    "accountant": "accountant",
    "admin": "admin",
    "visitor": "visitor",
    "public": "public",
    "common": "common",
    "auth": "auth",
}


def pascal_to_camel(name: str) -> str:
    if not name:
        return name
    return name[0].lower() + name[1:]


def screen_folder(screen_path: str) -> tuple[str, str, str]:
    rel = os.path.relpath(screen_path, SCREENS)
    role = rel.split(os.sep)[0]
    base = os.path.basename(screen_path).replace("Screen.tsx", "")
    folder_name = pascal_to_camel(base)
    comp_dir = os.path.join(COMPONENTS, ROLE_MAP.get(role, role), folder_name)
    styles_name = f"{folder_name}Styles"
    return comp_dir, folder_name, styles_name


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


def extract_block_types(content: str) -> tuple[str, str]:
    pattern = re.compile(
        r"^((?:export )?(?:interface|type) \w+[\s\S]*?(?:\}\s*;|\}\s*\n))",
        re.MULTILINE,
    )
    types_parts = []
    for m in pattern.finditer(content):
        block = m.group(1).strip()
        if "StyleSheet" in block:
            continue
        types_parts.append(block + "\n")
    if not types_parts:
        return "", content
    types_text = "\n".join(types_parts)
    cleaned = pattern.sub("", content)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return types_text.strip() + "\n", cleaned


def extract_helpers(content: str) -> tuple[str, str]:
    """Extract top-level const/function helpers before export default."""
    export_m = re.search(r"\nexport default function", content)
    if not export_m:
        return "", content
    head = content[: export_m.start()]
    tail = content[export_m.start() :]

    helpers: list[str] = []
    remaining_lines: list[str] = []
    lines = head.splitlines(keepends=True)
    i = 0
    while i < len(lines):
        line = lines[i]
        # skip component definitions (capitalized const X: React.FC or function X with JSX)
        if re.match(r"^const [A-Z]\w+", line) or re.match(r"^function [A-Z]\w+", line):
            # consume until matching close for component
            block = [line]
            i += 1
            depth = line.count("{") - line.count("}")
            while i < len(lines) and depth > 0:
                block.append(lines[i])
                depth += lines[i].count("{") - lines[i].count("}")
                i += 1
            remaining_lines.extend(block)
            continue
        if re.match(r"^const \w+ = ", line) or re.match(r"^async function \w+", line) or re.match(r"^function \w+", line):
            block = [line]
            i += 1
            depth = line.count("{") - line.count("}") + line.count("(") - line.count(")")
            if "=>" in line and line.strip().endswith(";"):
                helpers.extend(block)
                continue
            while i < len(lines):
                block.append(lines[i])
                if lines[i].strip().endswith(";") and depth <= 0:
                    i += 1
                    break
                depth += lines[i].count("{") - lines[i].count("}")
                i += 1
            helpers.extend(block)
            continue
        remaining_lines.append(line)
        i += 1

    helpers_text = "".join(helpers).strip()
    new_head = "".join(remaining_lines)
    return helpers_text, new_head + tail


def ensure_import(content: str, import_line: str) -> str:
    if import_line.split("'")[1].split("/")[-1] in content:
        return content
    m = re.search(r"(^import .+?;\n)(?!import)", content, re.MULTILINE)
    if m:
        return content[: m.end()] + import_line + content[m.end() :]
    return import_line + content


def process_screen(screen_path: str, dry_run: bool = False) -> int:
    with open(screen_path, encoding="utf-8") as f:
        content = f.read()

    before = count_lines(screen_path)
    if before <= 600:
        return before

    comp_dir, folder_name, styles_name = screen_folder(screen_path)
    styles_block, content = extract_styles(content)
    types_text, content = extract_block_types(content)
    helpers_text, content = extract_helpers(content)

    if not styles_block and not types_text and not helpers_text:
        return before

    rel_import = os.path.relpath(comp_dir, os.path.dirname(screen_path)).replace("\\", "/")
    imports_to_add = []

    if not dry_run:
        os.makedirs(comp_dir, exist_ok=True)

    if styles_block:
        styles_file = os.path.join(comp_dir, f"{styles_name}.ts")
        styles_content = (
            "import { StyleSheet } from 'react-native';\n"
            "import { Theme } from '../../../theme/tokens';\n\n"
            f"export const {styles_name} = {styles_block.replace('const styles = ', '')}\n"
        )
        if not dry_run:
            with open(styles_file, "w", encoding="utf-8") as f:
                f.write(styles_content)
        content = content.replace("StyleSheet,", "").replace(", StyleSheet", "")
        content = content.replace("StyleSheet ", "")
        if f"from '{rel_import}'" not in content:
            imports_to_add.append(f"import {{ {styles_name} as styles }} from '{rel_import}/{styles_name}';")
        else:
            imports_to_add.append(f"import {{ {styles_name} as styles }} from '{rel_import}';")

    if types_text:
        types_file = os.path.join(comp_dir, "types.ts")
        if not dry_run:
            with open(types_file, "w", encoding="utf-8") as f:
                f.write(types_text + "\n")
        imports_to_add.append(f"import type {{ {', '.join(re.findall(r'(?:interface|type) (\\w+)', types_text))} }} from '{rel_import}/types';")

    if helpers_text:
        helpers_file = os.path.join(comp_dir, "helpers.ts")
        if not dry_run:
            with open(helpers_file, "w", encoding="utf-8") as f:
                f.write(helpers_text + "\n")
        for fn in re.findall(r"(?:const|function) (\w+)", helpers_text):
            if fn[0].islower():
                imports_to_add.append(f"import {{ {fn} }} from '{rel_import}/helpers';")
                break

    for imp in imports_to_add:
        content = ensure_import(content, imp + "\n")

    index_path = os.path.join(comp_dir, "index.ts")
    if not dry_run and os.path.isdir(comp_dir):
        exports = []
        if os.path.exists(os.path.join(comp_dir, "types.ts")):
            exports.append("export * from './types';")
        if os.path.exists(os.path.join(comp_dir, "helpers.ts")):
            exports.append("export * from './helpers';")
        if os.path.exists(os.path.join(comp_dir, f"{styles_name}.ts")):
            exports.append(f"export {{ {styles_name} }} from './{styles_name}';")
        if exports:
            with open(index_path, "w", encoding="utf-8") as f:
                f.write("\n".join(exports) + "\n")

    if not dry_run:
        with open(screen_path, "w", encoding="utf-8") as f:
            f.write(content)

    return count_lines(screen_path) if not dry_run else before


def main() -> int:
    dry = "--dry-run" in sys.argv
    results = []
    for dp, _, fs in os.walk(SCREENS):
        for f in fs:
            if not f.endswith("Screen.tsx"):
                continue
            p = os.path.join(dp, f)
            n = count_lines(p)
            if n > 600:
                after = process_screen(p, dry_run=dry)
                results.append((n, after, p))

    still = sum(1 for _, a, _ in results if a > 600)
    print(f"Processed {len(results)} screens, {still} still over 600")
    for before, after, p in sorted(results, key=lambda x: -x[0]):
        flag = "OK" if after <= 600 else "BIG"
        print(f"  [{flag}] {before:4d} -> {after:4d}  {os.path.relpath(p, ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
