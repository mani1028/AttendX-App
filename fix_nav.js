const fs = require('fs');

function addNav(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('const navigation =')) {
        content = "import { useNavigation } from '@react-navigation/native';\n" + content;
        content = content.replace(/(const\s+[A-Za-z0-9_]+\s*:\s*React\.FC[^=]*=\s*\([^)]*\)\s*=>\s*\{|export\s+default\s+function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{)/, "$1\n  const navigation = useNavigation<any>();\n");
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Fixed', filePath);
    }
}

addNav('./src/screens/admin/AdminAgentsScreen.tsx');
addNav('./src/screens/admin/AdminPlansScreen.tsx');
addNav('./src/screens/teacher/MarkAttendanceScreen.tsx');
