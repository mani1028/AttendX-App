#!/bin/bash
# AttendX — Dependency Fix Script
# Run this from your project root: bash fix_install.sh

set -e

echo "🔧 AttendX Install Fix"
echo "========================"

# 1. Patch package.json
echo ""
echo "📦 Step 1: Patching package.json..."

if [ ! -f package.json ]; then
  echo "❌ package.json not found. Run this script from your project root."
  exit 1
fi

# Use python to safely patch the JSON
python3 - << 'PYEOF'
import json, sys

with open('package.json', 'r') as f:
    pkg = json.load(f)

deps = pkg.get('dependencies', {})

# Fix lucide
old_lucide = deps.get('lucide-react-native', 'NOT FOUND')
deps['lucide-react-native'] = '^1.16.0'
print(f"  lucide-react-native: {old_lucide} → ^1.16.0")

# Fix worklets-core
old_worklets = deps.get('react-native-worklets-core', 'NOT FOUND')
deps['react-native-worklets-core'] = '^1.6.3'
print(f"  react-native-worklets-core: {old_worklets} → ^1.6.3")

pkg['dependencies'] = deps

with open('package.json', 'w') as f:
    json.dump(pkg, f, indent=2)
    f.write('\n')

print("  ✅ package.json updated")
PYEOF

# 2. Clean node_modules
echo ""
echo "🧹 Step 2: Cleaning node_modules..."
rm -rf node_modules package-lock.json
echo "  ✅ Cleaned"

# 3. Install
echo ""
echo "📥 Step 3: Installing dependencies..."
npm install --legacy-peer-deps
echo "  ✅ npm install complete"

# 4. iOS pods
echo ""
echo "🍎 Step 4: Updating iOS pods..."
cd ios
pod repo update
pod install
cd ..
echo "  ✅ pod install complete"

echo ""
echo "🎉 All done! Run the app with:"
echo "   npx react-native run-ios"
echo "   npx react-native run-android"
