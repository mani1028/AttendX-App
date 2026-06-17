import re

admin_path = 'src/screens/admin/AdminDashboardScreen.tsx'
with open(admin_path, 'r') as f:
    content = f.read()

# Remove DeleteConfirmModal definition
modal_match = re.search(r'// Delete Confirmation Modal\nconst DeleteConfirmModal: React\.FC<\{.*?^};\n', content, re.MULTILINE | re.DOTALL)
if modal_match:
    content = content.replace(modal_match.group(0), '')

# Remove state: const [deleteTarget, setDeleteTarget] = useState<School | null>(null);
content = re.sub(r'  const \[deleteTarget, setDeleteTarget\] = useState<School \| null>\(null\);\n', '', content)

# Remove handleDelete
handle_delete_match = re.search(r'  const handleDelete = async \(\) => \{.*?^\s*};\n', content, re.MULTILINE | re.DOTALL)
if handle_delete_match:
    content = content.replace(handle_delete_match.group(0), '')

# Remove DeleteConfirmModal usage
usage_match = re.search(r'      <DeleteConfirmModal\n.*?/>\n', content, re.MULTILINE | re.DOTALL)
if usage_match:
    content = content.replace(usage_match.group(0), '')

# Remove Del button from SchoolCard
del_btn_match = re.search(r'        <TouchableOpacity\n\s*style=\{\[styles\.actionBtn, styles\.deleteBtn\]\}.*?</TouchableOpacity>\n', content, re.MULTILINE | re.DOTALL)
if del_btn_match:
    content = content.replace(del_btn_match.group(0), '')

# Remove onDelete from SchoolCard props
content = content.replace('onDelete: (school: School) => void;', '')
content = content.replace('onDelete, ', '')
content = content.replace('onDelete={setDeleteTarget}', '')
content = content.replace(', onDelete', '')

with open(admin_path, 'w') as f:
    f.write(content)

print("Removed DeleteConfirmModal from AdminDashboardScreen.tsx")
