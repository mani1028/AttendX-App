#!/usr/bin/env node

/**
 * Script to wrap all elevation properties with Platform.select()
 * Usage: node fix-elevation-styles.js
 * 
 * This script:
 * 1. Finds all files with elevation styles
 * 2. Wraps elevation: X with Platform.select({ android: { elevation: X }, ios: {} })
 * 3. Adds Platform import if missing
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const srcDir = path.join(__dirname, 'src');
const filesToFix = [
  'screens/teacher/TeacherDashboardScreen.tsx',
  'screens/teacher/LeaveApprovalScreen.tsx',
  'screens/teacher/ViewAttendanceScreen.tsx',
  'screens/student/QuestionPapersScreen.tsx',
  'screens/student/LeaveScreen.tsx',
  'screens/teacher/LeaveRequestScreen.tsx',
  'screens/student/StudentFeeScreen.tsx',
  'screens/teacher/MarksEntryScreen.tsx',
  'screens/principal/BranchDetailsScreen.tsx',
  'components/layout/CustomTabBar.tsx',
  'components/layout/TeacherTabBar.tsx',
  'screens/hm/HMAttendanceScreen.tsx',
];

function addPlatformImport(content, filePath) {
  const lines = content.split('\n');
  const imports = [];
  let lastImportIndex = -1;
  let hasReactNativeImport = false;
  let hasReactNativeImportWithPlatform = false;

  // Find all import lines and check for Platform
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^import.*from\s+['"]react-native['"]/)) {
      hasReactNativeImport = true;
      lastImportIndex = i;
      if (lines[i].includes('Platform')) {
        hasReactNativeImportWithPlatform = true;
        break;
      }
    }
  }

  if (!hasReactNativeImport) {
    console.log(`  ⚠️  No react-native import found in ${filePath}`);
    return content;
  }

  if (hasReactNativeImportWithPlatform) {
    console.log(`  ✅ Platform already imported in ${filePath}`);
    return content;
  }

  // Add Platform to the existing import
  lines[lastImportIndex] = lines[lastImportIndex].replace(
    /(\s+)(.*)(from\s+['"]react-native['"])/,
    (match, indent, imports, from) => {
      // Parse existing imports and add Platform
      const importStr = imports
        .replace(/[{}]/g, '')
        .split(',')
        .map(i => i.trim())
        .filter(i => i);
      
      if (!importStr.includes('Platform')) {
        importStr.push('Platform');
      }
      
      return `${indent}{\n  ${importStr.join(',\n  ')},\n}${indent === ' ' ? ' ' : '\n'}${from}`;
    }
  );

  return lines.join('\n');
}

function wrapElevation(content, filePath) {
  // Pattern to match elevation properties
  // Matches: elevation: NUMBER,
  const elevationPattern = /(\s+)elevation:\s*(\d+),/g;

  if (!elevationPattern.test(content)) {
    console.log(`  ℹ️  No elevation found in ${filePath}`);
    return content;
  }

  let modifiedContent = content;
  let count = 0;

  modifiedContent = modifiedContent.replace(
    /(\s+)elevation:\s*(\d+),/g,
    (match, indent, elevationValue) => {
      count++;
      return `${indent}...Platform.select({
${indent}  android: { elevation: ${elevationValue} },
${indent}  ios: {},
${indent}}),`;
    }
  );

  if (count > 0) {
    console.log(`  ✏️  Fixed ${count} elevation style(s) in ${filePath}`);
  }

  return modifiedContent;
}

function fixFile(filePath) {
  const fullPath = path.join(srcDir, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`  ❌ File not found: ${filePath}`);
    return;
  }

  console.log(`\n📝 Processing: ${filePath}`);
  
  try {
    let content = fs.readFileSync(fullPath, 'utf-8');
    
    content = addPlatformImport(content, filePath);
    content = wrapElevation(content, filePath);
    
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`  ✅ Updated successfully`);
  } catch (error) {
    console.error(`  ❌ Error processing file: ${error.message}`);
  }
}

console.log('\n🚀 AttendX Elevation Style Fixer\n');
console.log('Wrapping elevation styles with Platform.select()...\n');

filesToFix.forEach(file => fixFile(file));

console.log('\n✨ Done! All elevation styles have been wrapped with Platform.select()\n');
console.log('Note: Please review the changes before committing.\n');
