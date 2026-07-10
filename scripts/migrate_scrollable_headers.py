#!/usr/bin/env python3
"""Move StandardPageHeader / DashboardHeroHeader into ScrollView (scroll-with-body)."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCREENS = ROOT / "src" / "screens"

HEADER_START = re.compile(r"<StandardPageHeader\b")
HEADER_END = re.compile(r"/>\s*|</StandardPageHeader>")
SCROLL_START = re.compile(r"<ScrollView\b")


def find_matching_close(text: str, start: int, open_tag: str, close_tag: str) -> int:
    depth = 0
    i = start
    open_len = len(open_tag)
    close_len = len(close_tag)
    while i < len(text):
        if text.startswith(open_tag, i):
            depth += 1
            i += open_len
            continue
        if text.startswith(close_tag, i):
            depth -= 1
            if depth == 0:
                return i + close_len
            i += close_len
            continue
        i += 1
    return -1


def extract_jsx_block(text: str, start: int) -> tuple[str, int]:
    """Extract self-closing or paired JSX from start index."""
    if text[start:].startswith("<StandardPageHeader"):
        # find end of opening tag props then /> or </...>
        m = re.search(r"(<StandardPageHeader[\s\S]*?)(/>|</StandardPageHeader>)", text[start:])
        if not m:
            raise ValueError("unclosed StandardPageHeader")
        block = m.group(1) + m.group(2)
        return block, start + m.end()
    raise ValueError(f"unknown block at {start}")


def ensure_import(content: str) -> str:
    if "innerPageLayoutStyles" in content:
        return content
    if "from '../../components/layout/innerPageLayoutStyles'" in content:
        return content
    # insert after last import
    lines = content.splitlines(keepends=True)
    last_import = 0
    for i, line in enumerate(lines):
        if line.startswith("import "):
            last_import = i
    insert = "import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';\n"
    # depth-based relative path guess
    if "from '../../../components/layout/innerPageLayoutStyles'" in content:
        return content
    depth = content.count("from '../")  # rough
    rel = "../" * (content[:content.find("src/screens")].count("/") or 2)
    # simpler: detect existing layout imports
    for line in lines:
        if "components/layout/" in line and "import" in line:
            insert = line.replace(
                re.search(r"import \{[^}]+\} from '([^']+)'", line).group(1),
                re.search(r"import \{[^}]+\} from '([^']+)'", line).group(1),
            )
            break
    else:
        # count ../ in a typical import from same folder depth as StandardPageHeader
        m = re.search(r"import StandardPageHeader from '([^']+)'", content)
        if m:
            base = m.group(1).rsplit("/", 1)[0]
            insert = f"import {{ innerPageLayoutStyles }} from '{base}/innerPageLayoutStyles';\n"
        else:
            insert = "import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';\n"

    lines.insert(last_import + 1, insert)
    return "".join(lines)


def patch_header_block(block: str) -> str:
    if "scrollWithContent" in block:
        return block
    block = block.replace("<StandardPageHeader", "<StandardPageHeader\n        scrollWithContent", 1)
    if "containerStyle=" not in block:
        block = block.replace(
            "<StandardPageHeader\n        scrollWithContent",
            "<StandardPageHeader\n        scrollWithContent\n        containerStyle={innerPageLayoutStyles.scrollHeaderBleed}",
            1,
        )
    return block


def migrate_file(path: Path) -> bool:
    content = path.read_text()
    if "scrollWithContent" in content and "StandardPageHeader" in content:
        return False
    if "<StandardPageHeader" not in content:
        return False

    # skip if header already inside scroll (heuristic: scrollWithContent present)
    if "scrollWithContent" in content:
        return False

    # Pattern: optional contentOverlap wrapper
    overlap_pat = re.compile(
        r"(?P<header><StandardPageHeader[\s\S]*?/>)\s*"
        r"(?:<View style=\{[^}]*contentOverlap[^}]*\}>\s*)?"
        r"(?P<scroll><ScrollView\b[\s\S]*?>)",
        re.MULTILINE,
    )
    m = overlap_pat.search(content)
    if not m:
        return False

    header = patch_header_block(m.group("header").strip())
    scroll_open = m.group("scroll")

    # remove header (+ optional overlap open) before scroll
    old = m.group(0)
    new = scroll_open + "\n        " + header + "\n"
    content = content.replace(old, new, 1)

    # remove contentOverlap closing if we removed opening
    if "contentOverlap" in old and "contentOverlap" not in new:
        content = re.sub(
            r"\n\s*</View>\s*\n(\s*</ScrollView>)",
            r"\n\1",
            content,
            count=1,
        )

    content = ensure_import(content)
    path.write_text(content)
    return True


def main() -> int:
    changed = []
    for path in sorted(SCREENS.rglob("*Screen.tsx")):
        try:
            if migrate_file(path):
                changed.append(str(path.relative_to(ROOT)))
        except Exception as e:
            print(f"skip {path}: {e}", file=sys.stderr)
    print(f"migrated {len(changed)} files")
    for p in changed:
        print(f"  {p}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
