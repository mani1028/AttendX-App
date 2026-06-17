import re
import os

with open("src/screens/admin/AdminDashboardScreen.tsx", "r") as f:
    lines = f.readlines()

def get_lines(start, end):
    return "".join(lines[start-1:end])

agents_code = get_lines(738, 1134)
plans_code = get_lines(1136, 1530)

# Build AdminAgentsScreen.tsx
agents_screen = f"""import React, {{ useState, useEffect, useMemo }} from 'react';
import {{
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  Platform,
  Modal
}} from 'react-native';
import {{ useSafeAreaInsets }} from 'react-native-safe-area-context';
import {{ Search, X, Plus, Edit2, Users }} from 'lucide-react-native';
import * as adminService from '../../services/adminService';
import {{ colors }} from '../../constants/theme';
import AppText from '../../components/common/AppText';
import AppButton from '../../components/common/AppButton';
import Loader from '../../components/common/Loader';
import {{ formatErrorMessage }} from '../../utils/helpers';

{agents_code}

export default function AdminAgentsScreen() {{
  const insets = useSafeAreaInsets();
  return (
    <View style={{[styles.screenContainer, {{ paddingTop: insets.top, paddingBottom: insets.bottom }}]}}>
      <AgentManagementModal visible={{true}} onClose={{() => {{}}}} />
    </View>
  );
}}

const styles = StyleSheet.create({{
  screenContainer: {{
    flex: 1,
    backgroundColor: colors.background,
  }},
  modalOverlay: {{
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  }},
  modalContent: {{
    width: '100%',
    height: '100%',
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
  }},
  modalHeader: {{
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  }},
  modalTitle: {{ fontSize: 18, fontWeight: 'bold', color: colors.text }},
  modalClose: {{ padding: 4 }},
  modalBody: {{ padding: 20 }},
  modalFooter: {{ flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: colors.border }},
  formGroup: {{ marginBottom: 16 }},
  formLabel: {{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 }},
  formInput: {{ backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 14, color: colors.text }},
  formInputError: {{ borderColor: colors.error }},
  formError: {{ fontSize: 11, color: colors.error, marginTop: 4 }},
  switchRow: {{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }},
  switchLabel: {{ fontSize: 14, color: colors.text }},
  searchContainer: {{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, height: 40, flex: 1 }},
  searchInput: {{ flex: 1, fontSize: 14, color: colors.text, padding: 0 }},
  clearBtn: {{ padding: 4 }},
  agentCard: {{ backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, marginBottom: 12 }},
  agentCardHeader: {{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }},
  agentName: {{ fontSize: 15, fontWeight: 'bold', color: colors.text }},
  agentUsername: {{ fontSize: 13, color: colors.textMuted }},
  agentEmail: {{ fontSize: 13, color: colors.text, marginTop: 8 }},
  statusBadge: {{ borderRadius: 4, alignItems: 'center', justifyContent: 'center' }},
  statusText: {{ fontWeight: '600' }},
  agentEditBtn: {{ padding: 8, backgroundColor: colors.primarySoft, borderRadius: 8 }},
  capabilitiesContainer: {{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }},
  capTag: {{ backgroundColor: colors.border, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }},
  capTagText: {{ fontSize: 11, color: colors.text }},
  agentActionBtn: {{ marginTop: 16, paddingVertical: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1 }},
  agentDeactivateBtn: {{ borderColor: colors.errorSoft, backgroundColor: colors.errorSoft }},
  agentActivateBtn: {{ borderColor: colors.successSoft, backgroundColor: colors.successSoft }},
  agentActionBtnText: {{ fontWeight: '600', fontSize: 13 }},
}});
"""

# Modify agents_code inside to not be a Modal if possible, or just wrap it in the screen.
# If we wrap the modal with visible={true}, it'll show.
# But it has `transparent animationType="slide"`. It's better to remove the <Modal> wrapper.
agents_screen = agents_screen.replace('<Modal visible={visible} transparent animationType="slide">', '<View style={{flex: 1}}>')
agents_screen = agents_screen.replace('</Modal>', '</View>')

with open("src/screens/admin/AdminAgentsScreen.tsx", "w") as f:
    f.write(agents_screen)

# Build AdminPlansScreen.tsx
plans_screen = f"""import React, {{ useState, useEffect, useMemo }} from 'react';
import {{
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  Platform,
  Modal
}} from 'react-native';
import {{ useSafeAreaInsets }} from 'react-native-safe-area-context';
import {{ Search, X, Plus, Edit2, ClipboardList, Trash2 }} from 'lucide-react-native';
import * as adminService from '../../services/adminService';
import {{ colors }} from '../../constants/theme';
import AppText from '../../components/common/AppText';
import AppButton from '../../components/common/AppButton';
import Loader from '../../components/common/Loader';
import {{ formatErrorMessage }} from '../../utils/helpers';

{plans_code}

export default function AdminPlansScreen() {{
  const insets = useSafeAreaInsets();
  return (
    <View style={{[styles.screenContainer, {{ paddingTop: insets.top, paddingBottom: insets.bottom }}]}}>
      <PlansManagementModal visible={{true}} onClose={{() => {{}}}} />
    </View>
  );
}}

const styles = StyleSheet.create({{
  screenContainer: {{
    flex: 1,
    backgroundColor: colors.background,
  }},
  modalOverlay: {{
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  }},
  modalContent: {{
    width: '100%',
    height: '100%',
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
  }},
  modalHeader: {{
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  }},
  modalTitle: {{ fontSize: 18, fontWeight: 'bold', color: colors.text }},
  modalClose: {{ padding: 4 }},
  modalBody: {{ padding: 20 }},
  modalFooter: {{ flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: colors.border }},
  formGroup: {{ marginBottom: 16 }},
  formLabel: {{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 }},
  formInput: {{ backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 14, color: colors.text }},
  formInputError: {{ borderColor: colors.error }},
  formError: {{ fontSize: 11, color: colors.error, marginTop: 4 }},
  switchRow: {{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }},
  switchLabel: {{ fontSize: 14, color: colors.text }},
  searchContainer: {{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, height: 40, flex: 1 }},
  searchInput: {{ flex: 1, fontSize: 14, color: colors.text, padding: 0 }},
  clearBtn: {{ padding: 4 }},
  planCard: {{ backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, marginBottom: 12 }},
  planHeader: {{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }},
  planTitle: {{ fontSize: 16, fontWeight: 'bold', color: colors.text }},
  planCodeBadge: {{ backgroundColor: colors.border, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4, alignSelf: 'flex-start' }},
  planCodeText: {{ fontSize: 10, color: colors.textMuted, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }},
  planEditBtn: {{ padding: 8, backgroundColor: colors.primarySoft, borderRadius: 8 }},
  planDeleteBtn: {{ padding: 8, backgroundColor: colors.errorSoft, borderRadius: 8, marginLeft: 8 }},
  planDesc: {{ fontSize: 13, color: colors.textMuted, marginTop: 8, lineHeight: 18 }},
  planPriceRow: {{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }},
  priceLabel: {{ fontSize: 11, color: colors.textMuted }},
  priceValue: {{ fontSize: 14, fontWeight: '600', color: colors.text }},
  planLimits: {{ flexDirection: 'row', gap: 16, marginTop: 12 }},
  limitItem: {{ flexDirection: 'row', alignItems: 'center', gap: 4 }},
  limitText: {{ fontSize: 12, color: colors.text }},
  statusBadge: {{ borderRadius: 4, alignItems: 'center', justifyContent: 'center' }},
  statusText: {{ fontWeight: '600' }},
}});
"""

plans_screen = plans_screen.replace('<Modal visible={visible} transparent animationType="slide">', '<View style={{flex: 1}}>')
plans_screen = plans_screen.replace('</Modal>', '</View>')

with open("src/screens/admin/AdminPlansScreen.tsx", "w") as f:
    f.write(plans_screen)


