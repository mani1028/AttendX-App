#!/usr/bin/env python3
"""Fix ScreenSkeleton imports inserted inside multiline import blocks."""

import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "src" / "screens"

BAD = re.compile(
    r"import \{\nimport ScreenSkeleton from '([^']+)';\n",
    re.MULTILINE,
)


def fix(content: str) -> str:
    m = BAD.search(content)
    if not m:
        return content
    path = m.group(1)
    content = BAD.sub("import {\n", content)
    # Add after first complete import block
    block = re.search(r"^(import .+\n(?:import .+\n)*)", content, re.MULTILINE)
    if block:
        insert = f"import ScreenSkeleton from '{path}';\n"
        end = block.end()
        if insert.strip() not in content:
            content = content[:end] + insert + content[end:]
    return content


def main():
    n = 0
    for root, _, files in os.walk(ROOT):
        for f in files:
            if not f.endswith(".tsx"):
                continue
            p = Path(root) / f
            orig = p.read_text(encoding="utf-8")
            out = fix(orig)
            if out != orig:
                p.write_text(out, encoding="utf-8")
                n += 1
    print(f"Fixed {n} files")


if __name__ == "__main__":
    main()
