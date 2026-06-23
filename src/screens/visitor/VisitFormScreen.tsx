import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { visitorApi } from '../../services/visitorApi';

import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';
import Loader from '../../components/common/Loader';
import type { RootStackParamList } from '../../navigation/types';
import { formatErrorMessage } from '../../utils/helpers';
import { safeGoBack } from '../../utils/navigationHelpers';
import { Theme } from '../../theme/tokens';


// Types
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'VisitForm'>;

// Types
interface School {
  school_name: string;
  school_code: string;
  branch_id: string;
  qr_token_id: number;
}

interface Class {
  id: number;
  class_id: number;
  class_name: string;
  class_grade: string;
  branch_id?: string;
}

interface Section {
  id: number;
  section_id: string;
  section_name: string;
  class_id: number;
  branch_id?: string;
}

interface FormData {
  qr_token_id: number | null;
  full_name: string;
  phone: string;
  email: string;
  relation: string;
  student_name: string;
  student_class_id: string;
  student_section: string;
  purpose: string;
  sub_purpose: string;
  notes: string;
}

// Helper functions
const branchCandidates = (value: string): string[] => {
  const raw = String(value || '').trim();
  if (!raw) {return [];}

  const out = [raw];
  const altZero = raw.replace(/o/gi, '0');
  if (altZero && !out.includes(altZero)) {out.push(altZero);}

  if (/^\d+$/.test(altZero)) {
    const numeric = String(parseInt(altZero, 10));
    if (numeric && !out.includes(numeric)) {out.push(numeric);}
    const padded = altZero.padStart(2, '0');
    if (padded && !out.includes(padded)) {out.push(padded);}
  }

  return out.map(v => v.toLowerCase());
};

const branchMatches = (left: string, right: string): boolean => {
  const leftSet = new Set(branchCandidates(left));
  const rightSet = new Set(branchCandidates(right));
  if (!leftSet.size || !rightSet.size) {return false;}
  for (const v of leftSet) {
    if (rightSet.has(v)) {return true;}
  }
  return false;
};

const getClassId = (cls: Class): string => String(cls?.id ?? cls?.class_id ?? '');
const getSectionId = (section: Section): string => String(section?.id ?? section?.section_id ?? '');

export default function VisitFormScreen() {
  const route = useRoute();
  const navigation = useNavigation<NavigationProp>();
  const { token } = route.params as { token: string };

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [branchId, setBranchId] = useState<string>('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [success, setSuccess] = useState(false);
  const [submittedVisitorNo, setSubmittedVisitorNo] = useState('');

  const [form, setForm] = useState<FormData>({
    qr_token_id: null,
    full_name: '',
    phone: '',
    email: '',
    relation: '',
    student_name: '',
    student_class_id: '',
    student_section: '',
    purpose: '',
    sub_purpose: '',
    notes: '',
  });

  // Filter classes by branch
  const branchScopedClasses = classes.filter(cls => {
    const clsBranch = cls?.branch_id;
    if (!branchId || clsBranch === undefined || clsBranch === null || String(clsBranch).trim() === '') {
      return true;
    }
    return branchMatches(clsBranch, branchId);
  });

  // Get selected class
  const selectedClass = branchScopedClasses.find(cls => String(getClassId(cls)) === String(form.student_class_id));
  const selectedClassId = selectedClass ? String(getClassId(selectedClass)) : '';

  // Filter sections by branch
  const branchScopedSections = sections.filter(section => {
    const secBranch = section?.branch_id;
    if (!branchId || secBranch === undefined || secBranch === null || String(secBranch).trim() === '') {
      return true;
    }
    return branchMatches(secBranch, branchId);
  });

  // Get available sections for selected class
  const availableSections = selectedClassId
    ? branchScopedSections.filter(section => String(section?.class_id ?? '') === selectedClassId)
    : [];

  // Validate QR token
  const validateQR = useCallback(async () => {
    try {
      setLoading(true);
      const res = await visitorApi.validateQR(token);
      const { data } = res.data;
      setSchool(data);
      setBranchId(String(data.branch_id || '').trim());
      setClasses(data.classes || []);
      setSections(data.sections || []);
      setForm(prev => ({
        ...prev,
        qr_token_id: data.qr_token_id,
      }));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid QR code');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    validateQR();
  }, [validateQR]);

  const handleChange = (name: keyof FormData, value: string) => {
    if (name === 'student_class_id') {
      setForm(prev => ({
        ...prev,
        student_class_id: value,
        student_section: '',
      }));
      return;
    }
    setForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!form.full_name.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }
    if (!form.phone.trim() || !/^\d{10}$/.test(form.phone.trim())) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    if (!form.relation) {
      Alert.alert('Error', 'Please select relation to student');
      return;
    }
    if (!form.student_name.trim()) {
      Alert.alert('Error', 'Please enter student name');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        ...form,
        student_class_id: form.student_class_id ? parseInt(form.student_class_id) : null,
      };

      const res = await visitorApi.submitVisitor(payload);

      if (res.data?.success) {
        const visitorNo = res.data?.data?.visitor_no || '';
        setSubmittedVisitorNo(visitorNo);
        setSuccess(true);
        setTimeout(() => {
          navigation.replace('VisitSuccess', { visitor_no: visitorNo });
        }, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit visitor registration');
      Alert.alert('Error', formatErrorMessage(err.response?.data?.detail) || 'Failed to submit visitor registration');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (error && !school) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorCard}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.errorTitle}>Invalid QR Code</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <AppButton title="Go Home" onPress={() => navigation.replace('Login' as any)} />
        </View>
      </View>
    );
  }

  if (success) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successCard}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>Registration Submitted!</Text>
          <Text style={styles.successMessage}>
            Your visitor registration has been submitted successfully.
          </Text>
          <Text style={styles.visitorNo}>
            Visitor No: <Text style={styles.visitorNoValue}>{submittedVisitorNo || '-'}</Text>
          </Text>
          <Text style={styles.redirectText}>Redirecting...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* School Header */}
        <AppCard style={styles.headerCard}>
          <Text style={styles.schoolName}>{school?.school_name || 'School'}</Text>
          <Text style={styles.formTitle}>📋 Visitor Check-In Form</Text>
          {branchId && (
            <Text style={styles.branchInfo}>Branch ID: <Text style={styles.branchValue}>{branchId}</Text></Text>
          )}
        </AppCard>

        {/* Form Card */}
        <AppCard style={styles.formCard}>
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          {/* Name & Contact */}
          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="Your full name"
                placeholderTextColor="#94a3b8"
                value={form.full_name}
                onChangeText={(text) => handleChange('full_name', text)}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Phone Number <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="10-digit phone number"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                maxLength={10}
                value={form.phone}
                onChangeText={(text) => handleChange('phone', text.replace(/\D/g, '').slice(0, 10))}
              />
            </View>
          </View>

          {/* Email & Relation */}
          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="your.email@example.com"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={form.email}
                onChangeText={(text) => handleChange('email', text)}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Relation to Student <Text style={styles.required}>*</Text></Text>
              <View style={styles.pickerContainer}>
                {['parent', 'guardian', 'relative', 'other'].map(rel => (
                  <TouchableOpacity accessibilityRole="button"
                    key={rel}
                    style={[styles.pickerOption, form.relation === rel && styles.pickerOptionActive]}
                    onPress={() => handleChange('relation', rel)}
                  >
                    <Text style={[styles.pickerText, form.relation === rel && styles.pickerTextActive]}>
                      {rel.charAt(0).toUpperCase() + rel.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Student Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Student Information</Text>
            <View style={styles.row}>
              <View style={styles.field}>
                <Text style={styles.label}>Student Name <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="Full name of student"
                  placeholderTextColor="#94a3b8"
                  value={form.student_name}
                  onChangeText={(text) => handleChange('student_name', text)}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Class</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipContainer}>
                    <TouchableOpacity accessibilityRole="button"
                      style={[styles.chip, !form.student_class_id && styles.chipActive]}
                      onPress={() => handleChange('student_class_id', '')}
                    >
                      <Text style={[styles.chipText, !form.student_class_id && styles.chipTextActive]}>
                        Select...
                      </Text>
                    </TouchableOpacity>
                    {branchScopedClasses.map(cls => (
                      <TouchableOpacity accessibilityRole="button"
                        key={getClassId(cls)}
                        style={[styles.chip, form.student_class_id === getClassId(cls) && styles.chipActive]}
                        onPress={() => handleChange('student_class_id', getClassId(cls))}
                      >
                        <Text style={[styles.chipText, form.student_class_id === getClassId(cls) && styles.chipTextActive]}>
                          {cls.class_name || cls.class_grade || 'Class'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>

            {form.student_class_id && (
              <View style={styles.field}>
                <Text style={styles.label}>Section</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipContainer}>
                    <TouchableOpacity accessibilityRole="button"
                      style={[styles.chip, !form.student_section && styles.chipActive]}
                      onPress={() => handleChange('student_section', '')}
                    >
                      <Text style={[styles.chipText, !form.student_section && styles.chipTextActive]}>
                        Select...
                      </Text>
                    </TouchableOpacity>
                    {availableSections.map(section => (
                      <TouchableOpacity accessibilityRole="button"
                        key={getSectionId(section)}
                        style={[styles.chip, form.student_section === section.section_name && styles.chipActive]}
                        onPress={() => handleChange('student_section', section.section_name)}
                      >
                        <Text style={[styles.chipText, form.student_section === section.section_name && styles.chipTextActive]}>
                          {section.section_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
          </View>

          {/* Visit Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Visit Details</Text>
            <View style={styles.row}>
              <View style={styles.field}>
                <Text style={styles.label}>Purpose of Visit <Text style={styles.required}>*</Text></Text>
                <View style={styles.pickerContainer}>
                  {['meeting', 'pickup', 'delivery', 'inspection', 'other'].map(pur => (
                    <TouchableOpacity accessibilityRole="button"
                      key={pur}
                      style={[styles.pickerOption, form.purpose === pur && styles.pickerOptionActive]}
                      onPress={() => handleChange('purpose', pur)}
                    >
                      <Text style={[styles.pickerText, form.purpose === pur && styles.pickerTextActive]}>
                        {pur === 'meeting' ? 'Parent-Teacher Meeting' :
                         pur === 'pickup' ? 'Student Pickup' :
                         pur === 'delivery' ? 'Delivery' :
                         pur === 'inspection' ? 'Inspection' : 'Other'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>More Details</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Additional details"
                  placeholderTextColor="#94a3b8"
                  value={form.sub_purpose}
                  onChangeText={(text) => handleChange('sub_purpose', text)}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Additional Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any additional information..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={form.notes}
                onChangeText={(text) => handleChange('notes', text)}
              />
            </View>
          </View>

          {/* Submit Button */}
          <View style={styles.buttonRow}>
            <AppButton
              title={submitting ? 'Submitting...' : '✅ Submit Registration'}
              onPress={handleSubmit}
              disabled={submitting}
              style={styles.submitBtn}
            />
            <AppButton
              title="Cancel"
              onPress={() => safeGoBack(navigation, 'VisitorDashboard')}
              type="secondary"
              style={styles.cancelBtn}
            />
          </View>
        </AppCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f7',
  },
  scrollContent: {
    padding: Theme.spacing.md,
    paddingBottom: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fef2f2',
  },
  errorCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 16,
    padding: Theme.spacing.lg,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: Theme.spacing.md,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Theme.colors.error,
    marginBottom: Theme.spacing.sm,
  },
  errorMessage: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    textAlign: 'center',
    marginBottom: 20,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f0fdf4',
  },
  successCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 16,
    padding: Theme.spacing.lg,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: Theme.spacing.md,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Theme.colors.success,
    marginBottom: Theme.spacing.sm,
  },
  successMessage: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
    textAlign: 'center',
    marginBottom: Theme.spacing.sm,
  },
  visitorNo: {
    fontSize: 13,
    color: '#4a5568',
    marginBottom: Theme.spacing.sm,
  },
  visitorNoValue: {
    fontWeight: '700',
    color: '#6648dc',
  },
  redirectText: {
    ...Theme.typography.caption,
    color: '#94a3b8',
  },
  headerCard: {
    padding: 20,
    marginBottom: Theme.spacing.md,
    alignItems: 'center',
  },
  schoolName: {
    fontSize: 24,
    fontWeight: '700',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.sm,
  },
  formTitle: {
    ...Theme.typography.body,
    color: Theme.colors.textSec,
  },
  branchInfo: {
    ...Theme.typography.caption,
    color: Theme.colors.textSec,
    marginTop: Theme.spacing.sm,
  },
  branchValue: {
    fontWeight: '600',
    color: '#6648dc',
  },
  formCard: {
    padding: 20,
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 10,
    marginBottom: Theme.spacing.md,
  },
  errorBannerText: {
    color: '#b91c1c',
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: Theme.spacing.md,
  },
  field: {
    flex: 1,
  },
  label: {
    ...Theme.typography.caption,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 6,
  },
  required: {
    color: Theme.colors.error,
  },
  input: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 10,
    padding: 12,
    ...Theme.typography.body,
    backgroundColor: Theme.colors.background,
    color: Theme.colors.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: 20,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  pickerOptionActive: {
    backgroundColor: '#6648dc',
    borderColor: '#6648dc',
  },
  pickerText: {
    fontSize: 13,
    color: '#4a5568',
  },
  pickerTextActive: {
    color: Theme.colors.card,
  },
  section: {
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  sectionTitle: {
    ...Theme.typography.body,
    fontWeight: '700',
    color: Theme.colors.text,
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: 20,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  chipActive: {
    backgroundColor: '#6648dc',
    borderColor: '#6648dc',
  },
  chipText: {
    fontSize: 13,
    color: '#4a5568',
  },
  chipTextActive: {
    color: Theme.colors.card,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: Theme.spacing.md,
  },
  submitBtn: {
    flex: 2,
  },
  cancelBtn: {
    flex: 1,
  },
});
