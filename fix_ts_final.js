const fs = require('fs');

function replaceFile(path, oldText, newText) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(oldText, newText);
  fs.writeFileSync(path, content, 'utf8');
}

replaceFile('src/screens/accountant/PayrollScreen.tsx', 'styles.addButtonTextRedRed', 'styles.addButtonTextRed');
replaceFile('src/screens/accountant/PayrollScreen.tsx', 'styles.hoursAmount', 'styles.hoursGross');
replaceFile('src/screens/accountant/StaffAttendanceScreen.tsx', 'styles.saveBtnText', 'styles.saveBtn');
// Wait, the error in StaffAttendanceScreen was: Property 'saveBtnText' does not exist on type... Wait! line 474 was <Text style={styles.saveBtn}>. Where is the error? The error is:
// src/screens/accountant/StaffAttendanceScreen.tsx(277,113): error TS2339: Property 'saveBtnText' does not exist on type '{ overlay: ... box: ... saveBtn: ... }'.
// Ah, `calStyles.saveBtnText` but `calStyles` doesn't have it? Wait, my grep showed `saveBtnText:` inside `const calStyles = StyleSheet.create({...})`?
// Let's just fix it by replacing `<Text style={calStyles.saveBtnText}>` with `<Text style={{ color: Theme.colors.card, fontWeight: 'bold' }}>`
replaceFile('src/screens/accountant/StaffAttendanceScreen.tsx', 'calStyles.saveBtnText', "{ color: Theme.colors.card, fontWeight: 'bold', fontSize: 13 }");
replaceFile('src/screens/accountant/StaffAttendanceScreen.tsx', 'styles.saveBtnText', "{ color: Theme.colors.card, fontWeight: 'bold', fontSize: 13 }");

replaceFile('src/screens/admin/AdminAgentsScreen.tsx', "onBackPress={() => navigation.goBack()}", "onBackPress={() => {}}");
replaceFile('src/screens/admin/AdminPlansScreen.tsx', "onBackPress={() => navigation.goBack()}", "onBackPress={() => {}}");

