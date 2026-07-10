#!/usr/bin/env python3
"""Replace centered ActivityIndicator loading blocks with ScreenSkeleton."""

import re
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "src" / "screens"

LOADER_PAT = re.compile(
    r'<ActivityIndicator\s+[^>]*size=["\']large["\'][^>]*/>',
    re.MULTILINE,
)

SKELETON_IMPORT = "import ScreenSkeleton from '{path}components/common/ScreenSkeleton';\n"


def rel_skeleton(path: Path) -> str:
    depth = len(path.relative_to(ROOT.parent).parts) - 1
    return "../" * depth


def process(content: str, path: Path) -> str:
    if "ScreenSkeleton" in content and not LOADER_PAT.search(content):
        return content
    if not LOADER_PAT.search(content):
        return content

    variant = "dashboard" if "Dashboard" in path.name else "list"
    replacement = f'<ScreenSkeleton variant="{variant}" />'
    content = LOADER_PAT.sub(replacement, content)

    if "ScreenSkeleton" not in content:
        imp = SKELETON_IMPORT.format(path=rel_skeleton(path))
        m = re.search(r"^(import .+\n)+", content, re.MULTILINE)
        pos = m.end() if m else 0
        content = content[:pos] + imp + content[pos:]
    return content


def main():
    n = 0
    for root, _, files in os.walk(ROOT):
        for f in files:
            if not f.endswith(".tsx"):
                continue
            p = Path(root) / f
            orig = p.read_text(encoding="utf-8")
            out = process(orig, p)
            if out != orig:
                p.write_text(out, encoding="utf-8")
                n += 1
                print(p.name)
    print(f"Done: {n} files")


if __name__ == "__main__":
    main()
