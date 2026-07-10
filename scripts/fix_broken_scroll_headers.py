#!/usr/bin/env python3
"""Fix migration bug: StandardPageHeader wrongly nested inside refreshControl prop."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCREENS = ROOT / "src" / "screens"

# refreshControl={ ... <RefreshControl .../> ... <StandardPageHeader .../> ... }
PAT = re.compile(
    r"refreshControl=\{\s*"
    r"(<RefreshControl\b[\s\S]*?/>)\s*"
    r"(<StandardPageHeader\b[\s\S]*?/>)\s*"
    r"\}",
    re.MULTILINE,
)

REPLACEMENT = r"refreshControl={\1}\n      >\n        \2"


def fix_file(path: Path) -> bool:
    text = path.read_text()
    if "refreshControl={" not in text or "<StandardPageHeader" not in text:
        return False
    new_text, n = PAT.subn(REPLACEMENT, text)
    if n == 0:
        return False
    # Remove duplicate `>` lines like `\n      >\n      >`
    new_text = re.sub(r">\s*\n\s*>", ">", new_text)
    path.write_text(new_text)
    return True


def main():
    fixed = []
    for path in sorted(SCREENS.rglob("*.tsx")):
        if fix_file(path):
            fixed.append(str(path.relative_to(ROOT)))
    print(f"fixed {len(fixed)} files")
    for p in fixed:
        print(f"  {p}")


if __name__ == "__main__":
    main()
