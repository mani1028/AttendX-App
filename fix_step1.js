const { Project, SyntaxKind } = require('ts-morph');
const path = require('path');

const project = new Project({
    tsConfigFilePath: path.join(__dirname, 'tsconfig.json'),
    skipAddingFilesFromTsConfig: true
});

const files = [
  'src/screens/principal/PrincipalDashboardScreen.tsx',
  'src/screens/principal/TeacherAssignmentsScreen.tsx',
  'src/screens/director/PrincipalRegistrationScreen.tsx',
  'src/screens/director/BranchDetailsScreen.tsx',
  'src/screens/student/StudentDashboardScreen.tsx',
  'src/screens/admin/AdminPlansScreen.tsx',
  'src/screens/admin/SettingsScreen.tsx',
  'src/screens/admin/SchoolDetailsScreen.tsx',
  'src/screens/admin/NotificationManagerScreen.tsx',
  'src/screens/admin/AdminAgentsScreen.tsx',
  'src/screens/common/NotificationsScreen.tsx',
  'src/screens/common/ProfileScreen.tsx',
  'src/screens/accountant/AccountantDashboardScreen.tsx',
  'src/screens/public/StudentRegisterPublicScreen.tsx',
  'src/screens/teacher/HomeworkManagementScreen.tsx',
  'src/screens/teacher/StudentRegistrationRequestsScreen.tsx',
  'src/screens/teacher/MarksEntryScreen.tsx',
  'src/screens/teacher/ViewAttendanceScreen.tsx',
  'src/screens/teacher/VitalScanScreen.tsx',
  'src/screens/teacher/StudentListScreen.tsx',
  'src/screens/teacher/StudentRegistrationScreen.tsx',
  'src/screens/teacher/LeaveRequestScreen.tsx',
  'src/screens/teacher/MarkAttendanceScreen.tsx'
];

project.addSourceFilesAtPaths(files.map(f => path.join(__dirname, f)));

for (const sourceFile of project.getSourceFiles()) {
    let changed = false;
    
    const jsxElements = sourceFile.getDescendantsOfKind(SyntaxKind.JsxElement);
    
    for (const el of jsxElements) {
        if (el.wasForgotten()) continue;
        const openingEl = el.getOpeningElement();
        const text = openingEl.getText();
        
        if (text.includes('headerStandard') || text.includes('borderBottomLeftRadius')) {
            // Try to find the title inside
            let title = "Screen";
            const textElements = el.getDescendantsOfKind(SyntaxKind.JsxText);
            for(const t of textElements) {
               if (t.wasForgotten()) continue;
               const val = t.getText().trim();
               if (val.length > 2 && !val.includes('{') && !val.includes('}')) {
                  title = val;
                  break;
               }
            }

            el.replaceWithText(`<StandardPageHeader title="${title}" onBackPress={() => navigation.goBack()} />`);
            changed = true;
            break; // Stop after first replacement to avoid invalidating AST
        }
    }

    if (changed) {
        const imports = sourceFile.getImportDeclarations();
        const hasImport = imports.some(i => i.getModuleSpecifierValue().includes('StandardPageHeader'));
        if (!hasImport) {
            sourceFile.addImportDeclaration({
                defaultImport: 'StandardPageHeader',
                moduleSpecifier: '../../components/layout/StandardPageHeader'
            });
        }
        
        const propAssignments = sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAssignment);
        for(const prop of propAssignments) {
           if (prop.wasForgotten()) continue;
           if(prop.getName() === 'borderBottomLeftRadius' || prop.getName() === 'borderBottomRightRadius') {
              prop.remove();
           }
        }
        
        sourceFile.saveSync();
        console.log("Updated", sourceFile.getFilePath());
    }
}
