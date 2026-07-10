#!/usr/bin/env python3
"""Extended design token migration for src/ (screens + components)."""

import re
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "src"

HEX_MAP = {
    "#1e3a8a": "Theme.colors.primary", "#1E3A8A": "Theme.colors.primary",
    "#172554": "Theme.colors.primaryDark", "#1e40af": "Theme.colors.primaryDark",
    "#3b82f6": "Theme.colors.primaryLight", "#3B82F6": "Theme.colors.primaryLight",
    "#60a5fa": "Theme.colors.primaryLight", "#2563eb": "Theme.colors.blue",
    "#2563EB": "Theme.colors.blue", "#1d4ed8": "Theme.colors.blueLight",
    "#0d1b2a": "Theme.colors.text", "#0D1B2A": "Theme.colors.text",
    "#0f172a": "Theme.colors.text", "#0F172A": "Theme.colors.text",
    "#1e293b": "Theme.colors.card", "#334155": "Theme.colors.cardAlt",
    "#4a5568": "Theme.colors.textSec", "#64748b": "Theme.colors.textSec",
    "#64748B": "Theme.colors.textSec", "#475569": "Theme.colors.textSec",
    "#6b7280": "Theme.colors.textMuted", "#8898aa": "Theme.colors.textMuted",
    "#94a3b8": "Theme.colors.textMuted", "#9ca3af": "Theme.colors.textMuted",
    "#cbd5e1": "Theme.colors.textSec", "#e4e9f2": "Theme.colors.border",
    "#E2E8F0": "Theme.colors.border", "#e2e8f0": "Theme.colors.border",
    "#f1f5f9": "Theme.colors.backgroundAlt", "#f5f7fa": "Theme.colors.background",
    "#F5F7FA": "Theme.colors.background", "#f8fafc": "Theme.colors.inputBg",
    "#F8FAFC": "Theme.colors.inputBg", "#eef2f8": "Theme.colors.backgroundAlt",
    "#ffffff": "Theme.colors.card", "#FFFFFF": "Theme.colors.card",
    "#fff": "Theme.colors.card", "#FFF": "Theme.colors.card",
    "#059669": "Theme.colors.success", "#10b981": "Theme.colors.success",
    "#34d399": "Theme.colors.success", "#22c55e": "Theme.colors.success",
    "#dc2626": "Theme.colors.error", "#ef4444": "Theme.colors.error",
    "#EF4444": "Theme.colors.error", "#f87171": "Theme.colors.error",
    "#d97706": "Theme.colors.warning", "#f59e0b": "Theme.colors.warning",
    "#fbbf24": "Theme.colors.warning", "#0ea5e9": "Theme.colors.info",
    "#38bdf8": "Theme.colors.secondary", "#7c3aed": "Theme.colors.violet",
    "#a78bfa": "Theme.colors.violet", "#dbeafe": "Theme.colors.blueLight",
    "#ede9fe": "Theme.colors.violetLight", "#fee2e2": "Theme.colors.redLight",
    "#d1fae5": "Theme.colors.greenLight", "#fef3c7": "Theme.colors.amberLight",
    "#e0f2fe": "Theme.colors.skyLight", "#007AFF": "Theme.colors.info",
    "#3498db": "Theme.colors.info", "#6648dc": "Theme.colors.violet",
    "#060e1f": "Theme.colors.background", "#0b1530": "Theme.colors.cardAlt",
    "#0d1e3d": "Theme.colors.card", "#f1f5f9": "Theme.colors.backgroundAlt",
}

SHADOW_SM = "...Theme.shadow.sm"
PROPS = ("padding", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight",
         "paddingHorizontal", "paddingVertical", "margin", "marginTop", "marginBottom",
         "marginLeft", "marginRight", "marginHorizontal", "marginVertical", "gap")


def rel_import(path: Path) -> str:
    depth = len(path.relative_to(ROOT).parts) - 1
    return "../" * depth + "theme/tokens"


def ensure_import(content: str, path: Path) -> str:
    if re.search(r"from ['\"].*theme/tokens['\"]", content):
        return content
    imp = f"import {{ Theme }} from '{rel_import(path)}';\n"
    m = re.search(r"^(import .+\n)+", content, re.MULTILINE)
    pos = m.end() if m else 0
    return content[:pos] + imp + content[pos:]


def migrate(content: str) -> str:
    for h, t in sorted(HEX_MAP.items(), key=lambda x: -len(x[0])):
        content = content.replace(f"'{h}'", t).replace(f'"{h}"', t)
    for n, t in {"4": "Theme.spacing.xs", "8": "Theme.spacing.sm", "12": "Theme.spacing.md",
                 "16": "Theme.spacing.md", "20": "Theme.spacing.xl", "24": "Theme.spacing.lg",
                 "32": "Theme.spacing.xl", "48": "Theme.spacing.xxl"}.items():
        for p in PROPS:
            content = re.sub(rf"({p}:\s*){n}\b", rf"\1{t}", content)
    for n, t in {"6": "Theme.radius.sm", "8": "Theme.radius.sm", "10": "Theme.radius.md",
                 "12": "Theme.radius.md", "14": "Theme.radius.md", "16": "Theme.radius.lg",
                 "18": "Theme.radius.lg", "20": "Theme.radius.xl", "24": "Theme.radius.xxl",
                 "30": "Theme.radius.xxxl", "36": "Theme.radius.xxxl"}.items():
        content = re.sub(rf"(borderRadius:\s*){n}\b", rf"\1{t}", content)
    for n, t in {"9": "Theme.typography.label.fontSize", "10": "Theme.typography.label.fontSize",
                 "11": "Theme.typography.label.fontSize", "12": "Theme.typography.caption.fontSize",
                 "13": "Theme.typography.caption.fontSize", "14": "Theme.typography.body.fontSize",
                 "15": "Theme.typography.bodyMd.fontSize", "16": "Theme.typography.h4.fontSize",
                 "17": "Theme.typography.h4.fontSize", "18": "Theme.typography.h3.fontSize",
                 "20": "Theme.typography.h3.fontSize", "22": "Theme.typography.h2.fontSize",
                 "24": "Theme.typography.h2.fontSize", "28": "Theme.typography.h1.fontSize"}.items():
        content = re.sub(rf"(fontSize:\s*){n}\b", rf"\1{t}", content)
    return content


def main():
    n = 0
    for root, _, files in os.walk(ROOT):
        for f in files:
            if not f.endswith((".tsx", ".ts")):
                continue
            if "tokens.ts" in f or "buildTheme.ts" in f:
                continue
            p = Path(root) / f
            orig = p.read_text(encoding="utf-8")
            out = migrate(orig)
            if out != orig:
                out = ensure_import(out, p)
                p.write_text(out, encoding="utf-8")
                n += 1
    print(f"Updated {n} files")


if __name__ == "__main__":
    main()
