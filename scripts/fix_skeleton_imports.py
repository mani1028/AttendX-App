#!/usr/bin/env python3
"""Add missing ScreenSkeleton imports."""

import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "src" / "screens"
IMPORT_LINE = "import ScreenSkeleton from '{rel}components/common/ScreenSkeleton';\n"


def rel(path: Path) -> str:
    depth = len(path.relative_to(ROOT.parent).parts) - 1
    return "../" * depth


def main():
    n = 0
    for root, _, files in os.walk(ROOT):
        for f in files:
            if not f.endswith(".tsx"):
                continue
            p = Path(root) / f
            content = p.read_text(encoding="utf-8")
            if "ScreenSkeleton" not in content or "common/ScreenSkeleton" in content:
                continue
            imp = IMPORT_LINE.format(rel=rel(p))
            m = re.search(r"^(import .+\n)+", content, re.MULTILINE)
            pos = m.end() if m else 0
            p.write_text(content[:pos] + imp + content[pos:], encoding="utf-8")
            n += 1
    print(f"Added import to {n} files")


if __name__ == "__main__":
    main()
