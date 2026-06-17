#!/bin/bash
# AttendX — Complete Dependency Fix
# Run from your project root: bash final_fix.sh

set -e
echo "🔧 AttendX Complete Fix"
echo "========================"

if [ ! -f package.json ]; then
  echo "❌ Run from your AttendX project root"
  exit 1
fi

echo ""
echo "📦 Patching package.json..."
python3 - << 'PYEOF'
import json

with open('package.json', 'r') as f:
    pkg = json.load(f)

deps = pkg.setdefault('dependencies', {})
devDeps = pkg.setdefault('devDependencies', {})

# Fix 1: lucide → 1.16.0 (React 19 support)
old = deps.get('lucide-react-native','not set')
deps['lucide-react-native'] = '^1.16.0'
print(f"  lucide-react-native: {old} → ^1.16.0")

# Fix 2: pin react-native-screens to 4.24.0 (4.25+ needs RN 0.82, you have 0.78)
old = deps.get('react-native-screens','not set')
deps['react-native-screens'] = '4.24.0'
print(f"  react-native-screens: {old} → 4.24.0 (pinned, 4.25+ needs RN 0.82+)")

# Fix 3: add worklets-core if missing
old = deps.get('react-native-worklets-core','NOT FOUND')
deps['react-native-worklets-core'] = '^1.6.3'
print(f"  react-native-worklets-core: {old} → ^1.6.3")

# Fix 4: add @react-native-community/cli to devDependencies (required by Podfile)
old = devDeps.get('@react-native-community/cli','NOT FOUND')
devDeps['@react-native-community/cli'] = '18.0.1'
print(f"  @react-native-community/cli: {old} → 18.0.1 (required by Podfile / pod install)")

pkg['dependencies'] = deps
pkg['devDependencies'] = devDeps

with open('package.json', 'w') as f:
    json.dump(pkg, f, indent=2)
    f.write('\n')

print("  ✅ package.json patched")
PYEOF

echo ""
echo "🧹 Cleaning..."
rm -rf node_modules package-lock.json
echo "  ✅ Cleaned"

echo ""
echo "📥 Installing (--legacy-peer-deps)..."
npm install --legacy-peer-deps
echo "  ✅ npm install done"

echo ""
echo "🍎 iOS pods..."
cd ios
pod repo update
pod install
cd ..
echo "  ✅ pod install done"

echo ""
echo "🎉 Done! Run with:"
echo "   npx react-native run-ios"
echo "   npx react-native run-android"
