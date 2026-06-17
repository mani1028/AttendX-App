import re

file_path = "src/screens/director/BranchDetailsScreen.tsx"
with open(file_path, "r") as f:
    c = f.read()

if "import { Theme }" not in c:
    c = c.replace("from 'lucide-react-native';", "from 'lucide-react-native';\nimport { Theme } from '../../theme/theme';")

c = c.replace("'#6648dc'", "Theme.colors.primary")
c = c.replace('color="#6648dc"', 'color={Theme.colors.primary}')
c = c.replace("'#f8f7ff'", "Theme.colors.background")
c = c.replace("'#5b3fcf'", "Theme.colors.primaryDark")
c = c.replace("'#c4b5fd'", "Theme.colors.secondary")

with open(file_path, "w") as f:
    f.write(c)
