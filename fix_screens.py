import os
import re

dir_path = "node_modules/react-native-screens/src/fabric"
for root, _, files in os.walk(dir_path):
    for f in files:
        if not f.endswith(".ts"):
            continue
        filepath = os.path.join(root, f)
        with open(filepath, "r") as file:
            content = file.read()

        # Fix WithDefault string literals
        content = re.sub(r"CT\.WithDefault<boolean, 'true'>", r"CT.WithDefault<boolean, true>", content)
        content = re.sub(r"CT\.WithDefault<boolean, 'false'>", r"CT.WithDefault<boolean, false>", content)

        # Fix WithDefault type aliases (inline the common ones)
        content = re.sub(r"CT\.WithDefault<HeaderSubviewTypes, 'left'>", r"CT.WithDefault<'back' | 'right' | 'left' | 'title' | 'center' | 'searchBar', 'left'>", content)
        content = re.sub(r"CT\.WithDefault<DirectionType, 'ltr'>", r"CT.WithDefault<'rtl' | 'ltr', 'ltr'>", content)
        content = re.sub(r"CT\.WithDefault<BackButtonDisplayMode, 'default'>", r"CT.WithDefault<'minimal' | 'default' | 'generic', 'default'>", content)
        content = re.sub(r"CT\.WithDefault<BlurEffect, 'none'>", r"CT.WithDefault<'none' | 'extraLight' | 'light' | 'dark' | 'regular' | 'prominent' | 'systemUltraThinMaterial' | 'systemThinMaterial' | 'systemMaterial' | 'systemThickMaterial' | 'systemChromeMaterial' | 'systemUltraThinMaterialLight' | 'systemThinMaterialLight' | 'systemMaterialLight' | 'systemThickMaterialLight' | 'systemChromeMaterialLight' | 'systemUltraThinMaterialDark' | 'systemThinMaterialDark' | 'systemMaterialDark' | 'systemThickMaterialDark' | 'systemChromeMaterialDark', 'none'>", content)
        content = re.sub(r"CT\.WithDefault<UserInterfaceStyle, 'unspecified'>", r"CT.WithDefault<'unspecified' | 'light' | 'dark', 'unspecified'>", content)
        content = re.sub(r"CT\.WithDefault<StackPresentation, 'push'>", r"CT.WithDefault<'push' | 'modal' | 'transparentModal' | 'fullScreenModal' | 'formSheet' | 'containedModal' | 'containedTransparentModal', 'push'>", content)
        content = re.sub(r"CT\.WithDefault<StackAnimation, 'default'>", r"CT.WithDefault<'default' | 'fade' | 'fade_from_bottom' | 'flip' | 'simple_push' | 'slide_from_bottom' | 'slide_from_right' | 'slide_from_left' | 'none', 'default'>", content)
        content = re.sub(r"CT\.WithDefault<SwipeDirection, 'vertical'>", r"CT.WithDefault<'vertical' | 'horizontal', 'vertical'>", content)
        content = re.sub(r"CT\.WithDefault<ReplaceAnimation, 'pop'>", r"CT.WithDefault<'push' | 'pop', 'pop'>", content)
        content = re.sub(r"CT\.WithDefault<SearchBarPlacement, 'stacked'>", r"CT.WithDefault<'stacked' | 'inline', 'stacked'>", content)
        content = re.sub(r"CT\.WithDefault<SearchBarAutoCapitalize, 'none'>", r"CT.WithDefault<'none' | 'words' | 'sentences' | 'characters', 'none'>", content)
        
        # In tabs/host/
        content = re.sub(r"CT\.WithDefault<TabsDirectionType, 'ltr'>", r"CT.WithDefault<'rtl' | 'ltr', 'ltr'>", content)

        # Fix DirectEventHandler | undefined
        content = re.sub(r"CT\.DirectEventHandler<[^>]+>\s*\|\s*undefined", lambda m: m.group(0).split('|')[0].strip(), content)

        # Inline Event Types
        content = re.sub(r"CT\.DirectEventHandler<OnAttachedEvent>", r"CT.DirectEventHandler<Readonly<{}>>", content)
        content = re.sub(r"CT\.DirectEventHandler<OnDetachedEvent>", r"CT.DirectEventHandler<Readonly<{}>>", content)
        content = re.sub(r"CT\.DirectEventHandler<OnPressHeaderBarButtonItemEvent>", r"CT.DirectEventHandler<Readonly<{ buttonId: string }>>", content)
        content = re.sub(r"CT\.DirectEventHandler<OnPressHeaderBarButtonMenuItemEvent>", r"CT.DirectEventHandler<Readonly<{ menuId: string }>>", content)
        content = re.sub(r"CT\.DirectEventHandler<FinishTransitioningEvent>", r"CT.DirectEventHandler<Readonly<{}>>", content)

        with open(filepath, "w") as file:
            file.write(content)

