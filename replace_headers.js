const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');

const project = new Project();
const files = [
  'src/screens/principal/TeacherAssignmentsScreen.tsx',
  'src/screens/director/PrincipalRegistrationScreen.tsx',
  'src/screens/admin/SettingsScreen.tsx',
  'src/screens/admin/SchoolDetailsScreen.tsx',
  'src/screens/admin/NotificationManagerScreen.tsx',
  'src/screens/common/NotificationsScreen.tsx',
  'src/screens/teacher/HomeworkManagementScreen.tsx',
  'src/screens/teacher/StudentRegistrationRequestsScreen.tsx',
  'src/screens/teacher/StudentListScreen.tsx',
  'src/screens/teacher/LeaveRequestScreen.tsx',
  // larger files
  'src/screens/director/BranchDetailsScreen.tsx',
  'src/screens/public/StudentRegisterPublicScreen.tsx',
  'src/screens/teacher/MarksEntryScreen.tsx',
  'src/screens/teacher/ViewAttendanceScreen.tsx',
  'src/screens/teacher/VitalScanScreen.tsx',
  'src/screens/teacher/StudentRegistrationScreen.tsx',
  'src/screens/teacher/MarkAttendanceScreen.tsx'
];

for (const f of files) {
  if (fs.existsSync(f)) {
    project.addSourceFileAtPath(f);
  }
}

for (const sourceFile of project.getSourceFiles()) {
  let needsImport = false;
  let hasStandardHeader = false;

  const importDeclarations = sourceFile.getImportDeclarations();
  for (const imp of importDeclarations) {
    if (imp.getModuleSpecifierValue().includes('StandardPageHeader')) {
      hasStandardHeader = true;
    }
  }

  // Find all JsxElements
  const jsxElements = sourceFile.getDescendantsOfKind(SyntaxKind.JsxElement);
  
  for (const jsx of jsxElements) {
    const opening = jsx.getOpeningElement();
    const name = opening.getTagNameNode().getText();
    
    if (name === 'View' || name === 'LinearGradient') {
      const text = jsx.getText();
      if (text.includes('borderBottomLeftRadius') && (text.includes('ChevronLeft') || text.includes('ArrowLeft'))) {
        
        // Very basic extraction of title - look for heroTitle or similar text
        const titleMatch = text.match(/<AppText[^>]*>([^<]+)<\/AppText>/);
        const title = titleMatch ? titleMatch[1] : 'Screen';
        
        let backAction = "() => navigation.goBack()";
        const pressMatch = text.match(/onPress={([^}]+)}/);
        if (pressMatch) {
            backAction = pressMatch[1];
        }

        const replacement = `<StandardPageHeader title="${title}" onBackPress={${backAction}} />`;
        jsx.replaceWithText(replacement);
        needsImport = true;
      }
    }
  }

  if (needsImport && !hasStandardHeader) {
    sourceFile.addImportDeclaration({
      defaultImport: 'StandardPageHeader',
      moduleSpecifier: '../../components/layout/StandardPageHeader',
    });
  }

  sourceFile.saveSync();
  console.log('Saved', sourceFile.getFilePath());
}
