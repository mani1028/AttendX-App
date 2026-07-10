#!/usr/bin/env python3
"""Fix JSX attributes broken by token migration (add missing braces)."""

import re
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "src"

# color=Theme.colors.xxx -> color={Theme.colors.xxx}
ATTR_FIX = re.compile(
    r"(\w+)=((?:Theme\.(?:colors|spacing|radius|typography|shadow)(?:\.[a-zA-Z0-9_]+)+)(?:\s*\+\s*'[^']*')?)(?=[\s/>])"
)

# Also fix size=Theme.typography...
ATTR_FIX2 = re.compile(
    r"(\w+)=\{(Theme\.(?:colors|spacing|radius|typography)(?:\.[a-zA-Z0-9_]+)+)\}(?=[\s/>])"
)


def fix_content(content: str) -> str:
    def repl(m):
        attr, val = m.group(1), m.group(2)
        return f"{attr}={{{val}}}"
    content = ATTR_FIX.sub(repl, content)
    return content


def main():
    n = 0
    for root, _, files in os.walk(ROOT):
        for f in files:
            if not f.endswith((".tsx", ".ts")):
                continue
            p = Path(root) / f
            orig = p.read_text(encoding="utf-8")
            out = fix_content(orig)
            if out != orig:
                p.write_text(out, encoding="utf-8")
                n += 1
    print(f"Fixed {n} files")


if __name__ == "__main__":
    main()
