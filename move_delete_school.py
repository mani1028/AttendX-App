import os

admin_path = 'src/screens/admin/AdminDashboardScreen.tsx'
settings_path = 'src/screens/admin/SettingsScreen.tsx'

with open(admin_path, 'r') as f:
    admin_content = f.read()

# 1. Extract SecureDeleteModal
modal_start = admin_content.find('// Secure Delete Modal')
modal_end = admin_content.find('export default function AdminDashboardScreen')
if modal_start == -1 or modal_end == -1:
    print("Could not find modal")
    exit(1)
secure_modal_str = admin_content[modal_start:modal_end]

# 2. Extract Danger Zone JSX
dz_start = admin_content.find('        {/* Danger Zone Section */}')
dz_end = admin_content.find('      </ScrollView>', dz_start)
if dz_start == -1 or dz_end == -1:
    print("Could not find Danger Zone JSX")
    exit(1)
danger_zone_str = admin_content[dz_start:dz_end]

# 3. Extract SecureDeleteModal JSX usage
usage_start = admin_content.find('      <SecureDeleteModal')
usage_end = admin_content.find('      />', usage_start) + len('      />\n')
if usage_start == -1:
    print("Could not find modal usage")
    exit(1)
modal_usage_str = admin_content[usage_start:usage_end]

# 4. Extract styles
styles_start = admin_content.find('  dangerZoneCard: {')
styles_end = admin_content.find('  dangerZoneActionBtnText: {')
styles_end = admin_content.find('  },', styles_end) + 4
danger_zone_styles = admin_content[styles_start:styles_end]

m_styles_start = admin_content.find('  modalOverlay: {')
m_styles_end = admin_content.find('  switchLabel: {')
m_styles_end = admin_content.rfind('  },', m_styles_start, m_styles_end) + 4
modal_styles = admin_content[m_styles_start:m_styles_end]

# Delete from AdminDashboardScreen.tsx
new_admin = admin_content.replace(secure_modal_str, '')
new_admin = new_admin.replace(danger_zone_str, '')
new_admin = new_admin.replace(modal_usage_str, '')
new_admin = new_admin.replace('  const [secureDeleteModalOpen, setSecureDeleteModalOpen] = useState(false);\n', '')
new_admin = new_admin.replace(danger_zone_styles, '')

with open(admin_path, 'w') as f:
    f.write(new_admin)

print("AdminDashboardScreen updated.")

with open(settings_path, 'r') as f:
    settings_content = f.read()

settings_content = settings_content.replace(
    "import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, ActivityIndicator, Switch } from 'react-native';",
    "import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, ActivityIndicator, Switch, Modal, TextInput } from 'react-native';"
)

settings_content = settings_content.replace(
    "import { ChevronLeft, CreditCard, ShieldCheck, Bell, Settings } from 'lucide-react-native';",
    "import { ChevronLeft, CreditCard, ShieldCheck, Bell, Settings, Trash2, AlertTriangle, X } from 'lucide-react-native';"
)

imports_to_add = "import AppCard from '../../components/common/AppCard';\nimport AppButton from '../../components/common/AppButton';\nimport * as adminService from '../../services/adminService';\n\ninterface School {\n  id: string;\n  school_id: string;\n  name: string;\n  email: string;\n}\n\n"
settings_content = settings_content.replace("import API from '../../services/api';\n", "import API from '../../services/api';\n" + imports_to_add)

settings_content = settings_content.replace("export default function SettingsScreen", secure_modal_str + "\nexport default function SettingsScreen")

state_injection = "  const [schools, setSchools] = useState<School[]>([]);\n  const [secureDeleteModalOpen, setSecureDeleteModalOpen] = useState(false);\n"
settings_content = settings_content.replace("  const [enablePromotion, setEnablePromotion] = useState(true);\n", "  const [enablePromotion, setEnablePromotion] = useState(true);\n" + state_injection)

fetch_injection = "      const schoolsData = await adminService.getAllSchools();\n      setSchools(schoolsData);\n"
settings_content = settings_content.replace("      const res = await API.get('/pricing/admin/settings');", fetch_injection + "      const res = await API.get('/pricing/admin/settings');")

settings_content = settings_content.replace("      </ScrollView>", danger_zone_str + "      </ScrollView>")

modal_usage_new = """
      <SecureDeleteModal
        visible={secureDeleteModalOpen}
        schools={schools}
        onClose={() => setSecureDeleteModalOpen(false)}
        onDeleteSuccess={() => {
          loadSettingsData();
        }}
      />
"""
settings_content = settings_content.replace("    </View>\n  );\n}", modal_usage_new + "    </View>\n  );\n}")

idx = settings_content.rfind('});')
if idx != -1:
    settings_content = settings_content[:idx] + danger_zone_styles + '\n' + modal_styles + '\n' + settings_content[idx:]

with open(settings_path, 'w') as f:
    f.write(settings_content)

print("SettingsScreen updated.")
