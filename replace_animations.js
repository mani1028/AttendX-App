const fs = require('fs');
const path = require('path');

const files = [
  'src/screens/admin/AdminDashboardScreen.tsx',
  'src/screens/auth/ForgotPasswordScreen.tsx',
  'src/screens/auth/ResetPasswordScreen.tsx',
  'src/screens/auth/VerifyOtpScreen.tsx',
  'src/screens/common/PaymentDueScreen.tsx',
  'src/screens/director/DirectorBillingScreen.tsx',
  'src/screens/director/DirectorDashboardScreen.tsx',
  'src/screens/principal/TeacherAssignmentsScreen.tsx',
  'src/screens/teacher/LeaveApprovalScreen.tsx',
  'src/screens/auth/LoginScreen.tsx'
];

for (const f of files) {
  const file = path.join(__dirname, f);
  if (!fs.existsSync(file)) continue;

  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Attempt to replace fadeAnim / slideAnim declarations and their useEffect block
  // We look for:
  // const fadeAnim = ...;
  // const slideAnim = ...;
  // useEffect(() => { ... Animated.parallel ... }, []);
  // Note: some files might have other useEffects, so we must be precise.

  const blockRegex = /const fadeAnim\s*=\s*useRef\([^)]+\)\.current;\s*const slideAnim\s*=\s*useRef\([^)]+\)\.current;\s*useEffect\(\(\)\s*=>\s*\{[\s\S]*?Animated\.parallel[\s\S]*?\}\s*,\s*\[\]\);/g;

  if (blockRegex.test(content)) {
    content = content.replace(blockRegex, 'const { fadeAnim, slideAnim } = useScreenEntrance();');
    changed = true;
  } else {
    // try to match them if they are separated
    const declRegex = /const fadeAnim\s*=\s*useRef\([^)]+\)\.current;\s*const slideAnim\s*=\s*useRef\([^)]+\)\.current;/;
    const effectRegex = /useEffect\(\(\)\s*=>\s*\{[^}]*Animated\.parallel[^}]*\}\s*,\s*\[\]\);/;
    
    if (declRegex.test(content) && effectRegex.test(content)) {
      content = content.replace(declRegex, 'const { fadeAnim, slideAnim } = useScreenEntrance();');
      content = content.replace(effectRegex, '');
      changed = true;
    }
  }

  // Also catch LoginScreen specific one (might have slideAnim first)
  const loginBlockRegex = /const fadeAnim\s*=\s*useRef\([^)]+\)\.current;\s*const slideAnim\s*=\s*useRef\([^)]+\)\.current;\s*useEffect\(\(\)\s*=>\s*\{[\s\S]*?tension:\s*20[\s\S]*?\}\s*,\s*\[\]\);/g;
  
  if (loginBlockRegex.test(content)) {
     content = content.replace(loginBlockRegex, 'const { fadeAnim, slideAnim } = useScreenEntrance();');
     changed = true;
  }

  if (changed) {
    if (!content.includes('useScreenEntrance')) {
      // Add import
      const relativePath = path.relative(path.dirname(file), path.join(__dirname, 'src', 'theme', 'motion')).replace(/\\/g, '/');
      const importStatement = `import { useScreenEntrance } from '${relativePath.startsWith('.') ? relativePath : './' + relativePath}';\n`;
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const endOfLine = content.indexOf('\n', lastImportIndex);
        content = content.substring(0, endOfLine + 1) + importStatement + content.substring(endOfLine + 1);
      } else {
        content = importStatement + content;
      }
    }
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated animations in ${file}`);
  } else {
    console.log(`Failed to update ${file}`);
  }
}
