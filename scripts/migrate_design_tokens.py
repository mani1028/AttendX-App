#!/usr/bin/env python3
"""Migrate hardcoded design values to Theme tokens across src/screens."""

import re
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "src" / "screens"

# Hex -> Theme.colors token (longest match first for specificity)
HEX_MAP = {
    "#1e3a8a": "Theme.colors.primary",
    "#1E3A8A": "Theme.colors.primary",
    "#172554": "Theme.colors.primaryDark",
    "#3b82f6": "Theme.colors.primaryLight",
    "#3B82F6": "Theme.colors.primaryLight",
    "#2563eb": "Theme.colors.blue",
    "#2563EB": "Theme.colors.blue",
    "#0d1b2a": "Theme.colors.text",
    "#0D1B2A": "Theme.colors.text",
    "#0f172a": "Theme.colors.text",
    "#0F172A": "Theme.colors.text",
    "#4a5568": "Theme.colors.textSec",
    "#64748b": "Theme.colors.textSec",
    "#64748B": "Theme.colors.textSec",
    "#475569": "Theme.colors.textSec",
    "#8898aa": "Theme.colors.textMuted",
    "#94a3b8": "Theme.colors.textMuted",
    "#e4e9f2": "Theme.colors.border",
    "#E2E8F0": "Theme.colors.border",
    "#e2e8f0": "Theme.colors.border",
    "#f5f7fa": "Theme.colors.background",
    "#F5F7FA": "Theme.colors.background",
    "#f8fafc": "Theme.colors.inputBg",
    "#F8FAFC": "Theme.colors.inputBg",
    "#eef2f8": "Theme.colors.backgroundAlt",
    "#ffffff": "Theme.colors.card",
    "#FFFFFF": "Theme.colors.card",
    "#fff": "Theme.colors.card",
    "#FFF": "Theme.colors.card",
    "#059669": "Theme.colors.success",
    "#10b981": "Theme.colors.success",
    "#dc2626": "Theme.colors.error",
    "#ef4444": "Theme.colors.error",
    "#EF4444": "Theme.colors.error",
    "#d97706": "Theme.colors.warning",
    "#f59e0b": "Theme.colors.warning",
    "#0ea5e9": "Theme.colors.info",
    "#38bdf8": "Theme.colors.secondary",
    "#7c3aed": "Theme.colors.violet",
    "#dbeafe": "Theme.colors.blueLight",
    "#fee2e2": "Theme.colors.redLight",
    "#d1fae5": "Theme.colors.greenLight",
    "#fef3c7": "Theme.colors.amberLight",
    "#007AFF": "Theme.colors.info",
}

SPACING_MAP = {
    "4": "Theme.spacing.xs",
    "8": "Theme.spacing.sm",
    "16": "Theme.spacing.md",
    "24": "Theme.spacing.lg",
    "32": "Theme.spacing.xl",
    "48": "Theme.spacing.xxl",
}

RADIUS_MAP = {
    "8": "Theme.radius.sm",
    "12": "Theme.radius.md",
    "16": "Theme.radius.lg",
    "20": "Theme.radius.xl",
    "24": "Theme.radius.xxl",
    "36": "Theme.radius.xxxl",
    "999": "Theme.radius.full",
}

FONT_MAP = {
    "28": "Theme.typography.h1.fontSize",
    "22": "Theme.typography.h2.fontSize",
    "18": "Theme.typography.h3.fontSize",
    "16": "Theme.typography.h4.fontSize",
    "15": "Theme.typography.bodyMd.fontSize",
    "14": "Theme.typography.body.fontSize",
    "12": "Theme.typography.caption.fontSize",
    "11": "Theme.typography.label.fontSize",
}


def ensure_theme_import(content: str) -> str:
    if "Theme" in content and "from '../../theme/tokens'" in content:
        return content
    if "from '../../theme/tokens'" in content or "from \"../../theme/tokens\"" in content:
        return content
    # Find first import block end
    m = re.search(r"^(import .+\n)+", content, re.MULTILINE)
    depth = "../../"
    if m:
        insert_at = m.end()
    else:
        insert_at = 0
    imp = f"import {{ Theme }} from '{depth}theme/tokens';\n"
    return content[:insert_at] + imp + content[insert_at:]


def migrate_file(path: Path) -> bool:
    content = path.read_text(encoding="utf-8")
    original = content

    # Skip if already heavy Theme usage
    for hex_val, token in sorted(HEX_MAP.items(), key=lambda x: -len(x[0])):
        content = content.replace(f"'{hex_val}'", token)
        content = content.replace(f'"{hex_val}"', token)

    # Spacing in padding/margin/gap only
    for num, token in SPACING_MAP.items():
        for prop in ("padding", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight",
                     "paddingHorizontal", "paddingVertical", "margin", "marginTop", "marginBottom",
                     "marginLeft", "marginRight", "marginHorizontal", "marginVertical", "gap"):
            content = re.sub(
                rf"({prop}:\s*){num}\b",
                rf"\1{token}",
                content,
            )

    # Border radius
    for num, token in RADIUS_MAP.items():
        content = re.sub(rf"(borderRadius:\s*){num}\b", rf"\1{token}", content)

    # Font sizes
    for num, token in FONT_MAP.items():
        content = re.sub(rf"(fontSize:\s*){num}\b", rf"\1{token}", content)

    if content != original:
        content = ensure_theme_import(content)
        path.write_text(content, encoding="utf-8")
        return True
    return False


def main():
    changed = 0
    for root, _, files in os.walk(ROOT):
        for f in files:
            if f.endswith(".tsx"):
                p = Path(root) / f
                if migrate_file(p):
                    changed += 1
                    print(f"migrated: {p.relative_to(ROOT.parent.parent)}")
    print(f"Done. {changed} files updated.")


if __name__ == "__main__":
    main()
