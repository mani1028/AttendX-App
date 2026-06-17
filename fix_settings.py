import os

settings_path = 'src/screens/admin/SettingsScreen.tsx'

modal_code = """
// Secure Delete Modal
const SecureDeleteModal: React.FC<{
  visible: boolean;
  schools: School[];
  onClose: () => void;
  onDeleteSuccess: () => void;
}> = ({ visible, schools, onClose, onDeleteSuccess }) => {
  const [password, setPassword] = useState('');
  const [verified, setVerified] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setPassword('');
      setVerified(false);
      setSelectedSchool(null);
      setConfirmText('');
      setDeleting(false);
    }
  }, [visible]);

  const handleVerify = () => {
    if (password === 'admin123' || password === 'superadmin') {
      setVerified(true);
    } else {
      Alert.alert('Access Denied', 'Incorrect Super Admin password');
    }
  };

  const handleDelete = async () => {
    if (!selectedSchool) {
      Alert.alert('Error', 'Please select a school to delete');
      return;
    }
    if (confirmText !== 'DELETE') {
      Alert.alert('Error', 'Please type DELETE to confirm');
      return;
    }

    setDeleting(true);
    try {
      await adminService.deleteSchool(selectedSchool.id);
      Alert.alert('Success', `School ${selectedSchool.name} has been deleted`);
      onDeleteSuccess();
      onClose();
    } catch (err) {
      Alert.alert('Error', 'Failed to delete school');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <AppText style={[styles.modalTitle, { color: colors.error }]}>Secure Deletion</AppText>
              <AppText style={{ fontSize: 12, color: colors.textMuted }}>Danger Zone - Authorize school removal</AppText>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 24 }}>
            {!verified ? (
              <View style={{ gap: 16 }}>
                <View style={[styles.warningBanner, { backgroundColor: colors.errorSoft, borderColor: colors.errorSoft }]}>
                  <AlertTriangle size={18} color={colors.error} />
                  <AppText style={{ color: colors.error, fontSize: 12, fontWeight: '700', flex: 1 }}>
                    Security Authorization Required. Enter your super admin password to unlock these actions.
                  </AppText>
                </View>

                <View style={styles.formGroup}>
                  <AppText style={styles.formLabel}>Super Admin Password</AppText>
                  <TextInput
                    style={styles.formInput}
                    secureTextEntry
                    placeholder="Enter password..."
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>

                <AppButton title="Authorize Access" onPress={handleVerify} />
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                <View style={styles.formGroup}>
                  <AppText style={styles.formLabel}>Select School to Delete</AppText>
                  <TouchableOpacity
                    style={styles.formInput}
                    onPress={() => setShowPicker(true)}
                  >
                    <AppText style={{ color: selectedSchool ? colors.textPrimary : colors.textMuted }}>
                      {selectedSchool ? `${selectedSchool.school_id} - ${selectedSchool.name}` : 'Tap to select school...'}
                    </AppText>
                  </TouchableOpacity>
                </View>

                {selectedSchool && (
                  <>
                    <View style={[styles.warningBanner, { backgroundColor: colors.warningSoft }]}>
                      <AlertTriangle size={18} color={colors.warning} />
                      <AppText style={{ color: colors.warning, fontSize: 12, fontWeight: '700', flex: 1 }}>
                        CRITICAL: Deleting "{selectedSchool.name}" is permanent and will wipe all associated teachers, students, and attendance records.
                      </AppText>
                    </View>

                    <View style={styles.formGroup}>
                      <AppText style={styles.formLabel}>Type "DELETE" to confirm</AppText>
                      <TextInput
                        style={styles.formInput}
                        placeholder="Type DELETE..."
                        placeholderTextColor={colors.textMuted}
                        value={confirmText}
                        onChangeText={setConfirmText}
                        autoCapitalize="characters"
                      />
                    </View>

                    <AppButton
                      title={deleting ? 'Deleting school...' : 'Delete School Permanently'}
                      onPress={handleDelete}
                      disabled={deleting || confirmText !== 'DELETE'}
                    />
                  </>
                )}
              </View>
            )}
          </ScrollView>

          {/* Simple Dropdown list modal */}
          <Modal visible={showPicker} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { maxHeight: '60%' }]}>
                <View style={styles.modalHeader}>
                  <AppText style={styles.modalTitle}>Choose School</AppText>
                  <TouchableOpacity onPress={() => setShowPicker(false)} style={styles.modalClose}>
                    <X size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalBody}>
                  {schools.map(s => (
                    <TouchableOpacity
                      key={s.id}
                      style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}
                      onPress={() => {
                        setSelectedSchool(s);
                        setShowPicker(false);
                      }}
                    >
                      <AppText style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>
                        {s.school_id} - {s.name}
                      </AppText>
                      <AppText style={{ fontSize: 12, color: colors.textMuted }}>{s.email}</AppText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>

        </View>
      </View>
    </Modal>
  );
};
"""

danger_zone_jsx = """
        {/* Danger Zone Section */}
        <AppCard style={styles.dangerZoneCard}>
          <AppText style={styles.dangerZoneTitle}>Danger Zone</AppText>
          <AppText style={styles.dangerZoneSub}>Actions here require super admin password verification and are permanent.</AppText>
          <TouchableOpacity
            style={styles.dangerZoneActionBtn}
            onPress={() => setSecureDeleteModalOpen(true)}
            activeOpacity={0.7}
          >
            <Trash2 size={18} color="#fff" />
            <AppText style={styles.dangerZoneActionBtnText}>Delete Registered School</AppText>
          </TouchableOpacity>
        </AppCard>
"""

styles_code = """
  dangerZoneCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderColor: '#fecaca',
    borderWidth: 1.5,
    padding: 16,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginTop: 20,
  },
  dangerZoneTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.error,
    marginBottom: 4,
  },
  dangerZoneSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 16,
    lineHeight: 18,
  },
  dangerZoneActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.error,
    paddingVertical: 12,
    borderRadius: 12,
  },
  dangerZoneActionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    width: '100%',
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  formInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    backgroundColor: colors.bg,
    color: colors.textPrimary,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.warningSoft,
  },
"""

with open(settings_path, 'r') as f:
    content = f.read()

content = content.replace(
    "import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, ActivityIndicator, Switch } from 'react-native';",
    "import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, ActivityIndicator, Switch, Modal, TextInput } from 'react-native';"
)
content = content.replace(
    "import { ChevronLeft, CreditCard, ShieldCheck, Bell, Settings } from 'lucide-react-native';",
    "import { ChevronLeft, CreditCard, ShieldCheck, Bell, Settings, Trash2, AlertTriangle, X } from 'lucide-react-native';"
)

imports_add = """import AppCard from '../../components/common/AppCard';
import AppButton from '../../components/common/AppButton';
import * as adminService from '../../services/adminService';

interface School {
  id: string;
  school_id: string;
  name: string;
  email: string;
}

"""

content = content.replace("import AppText from '../../components/common/AppText';\n", "import AppText from '../../components/common/AppText';\n" + imports_add)

content = content.replace("export default function SettingsScreen", modal_code + "\nexport default function SettingsScreen")

content = content.replace(
    "  const [enablePromotion, setEnablePromotion] = useState(true);\n",
    "  const [enablePromotion, setEnablePromotion] = useState(true);\n  const [schools, setSchools] = useState<School[]>([]);\n  const [secureDeleteModalOpen, setSecureDeleteModalOpen] = useState(false);\n"
)

fetch_code = "      const schoolsData = await adminService.getAllSchools();\n      setSchools(schoolsData);\n"
content = content.replace(
    "      const res = await API.get('/pricing/admin/settings');",
    fetch_code + "      const res = await API.get('/pricing/admin/settings');"
)

content = content.replace("      </ScrollView>", danger_zone_jsx + "\n      </ScrollView>")

usage_jsx = """
      <SecureDeleteModal
        visible={secureDeleteModalOpen}
        schools={schools}
        onClose={() => setSecureDeleteModalOpen(false)}
        onDeleteSuccess={() => {
          loadSettingsData();
        }}
      />
"""
content = content.replace("    </View>\n  );\n}", usage_jsx + "    </View>\n  );\n}")

idx = content.rfind("});")
if idx != -1:
    content = content[:idx] + styles_code + content[idx:]

with open(settings_path, 'w') as f:
    f.write(content)
