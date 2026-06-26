import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  Dimensions,
  Image,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  User,
  Check,
  Plus,
  LogOut,
  Users,
  ChevronRight,
  ShieldCheck,
  GraduationCap,
  X,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { Theme } from '../../theme/tokens';
import { getLinkedProfiles, switchProfile } from '../../services/studentService';
import { setSessionData } from '../../utils/authSession';
import { setAuthToken } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { height: SCREEN_H } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
}

const AccountSwitcher: React.FC<Props> = ({ visible, onClose }) => {
  const {
    userRole,
    userName,
    userToken,
    savedAccounts,
    switchToAccount,
    logoutAccount,
    addNewAccount,
    refreshAuth,
  } = useAuth();
  const navigation = useNavigation();

  const [linkedProfiles, setLinkedProfiles] = useState<any[]>([]);
  const [currentRoll, setCurrentRoll] = useState<string>('');
  const [loadingLinked, setLoadingLinked] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Fetch linked profiles if student
      if (userRole?.toLowerCase() === 'student') {
        fetchLinked();
      }

      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      onClose();
    });
  };

  // Build a combined list of other accounts (saved sessions + linked profiles), deduped
  const buildCombinedOthers = (saved: any[], linked: any[], currentToken?: string, currentRoll?: string) => {
    const map = new Map<string, any>();

    // Add saved accounts first
    for (const acc of saved || []) {
      if (!acc || !acc.token) { continue; }
      // Use account id if present, else fallback to token
      const key = String(acc.id ?? acc.token).trim();
      if (!key) { continue; }
      // Skip current active session
      if (acc.token && currentToken && acc.token === currentToken) { continue; }
      map.set(key, { type: 'saved', key, data: acc });
    }

    // Add linked profiles, keyed by roll_no to avoid duplicates
    for (const p of linked || []) {
      const roll = String(p?.roll_no ?? p?.student_id ?? '').trim();
      if (!roll) { continue; }
      if (roll && currentRoll && roll === currentRoll) { continue; }
      // If saved session already exists for same roll, skip adding linked duplicate
      if (Array.from(map.values()).some(v => v.type === 'saved' && String(v.data?.student_id ?? v.data?.roll_no ?? '') === roll)) {
        continue;
      }
      if (!map.has(roll)) { map.set(roll, { type: 'linked', key: roll, data: p }); }
    }

    return Array.from(map.values());
  };

  const fetchLinked = async () => {
    setLoadingLinked(true);
    try {
      const profiles = await getLinkedProfiles();
      // Filter out the current profile and dedupe by roll_no
      const currentRollLocal = (await AsyncStorage.getItem('student_id')) || (await AsyncStorage.getItem('roll_no')) || '';
      setCurrentRoll(String(currentRollLocal));
      const map = new Map<string, any>();
      for (const p of profiles || []) {
        const roll = String(p?.roll_no ?? p?.student_id ?? '').trim();
        if (!roll) { continue; }
        if (roll === String(currentRollLocal)) { continue; }
        if (!map.has(roll)) { map.set(roll, p); }
      }
      setLinkedProfiles(Array.from(map.values()));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLinked(false);
    }
  };

  const handleSwitchSaved = async (account: any) => {
    setSwitching(account.id);
    const success = await switchToAccount(account);
    setSwitching(null);
    if (success) { handleClose(); }
  };

  const handleSwitchLinked = async (profile: any) => {
    setSwitching(profile.roll_no);
    try {
      const res = await switchProfile(profile.roll_no);
      if (res.token) {
        // Construct session data
        const sessionData = {
          role: 'student',
          token: res.token,
          school_code: await AsyncStorage.getItem('school_code'),
          branch_id: profile.branch_id,
          user: {
            ...res.student,
            name: profile.student_full_name,
            student_id: profile.roll_no,
            roll_no: profile.roll_no,
          },
        };
        await setSessionData(sessionData);
        setAuthToken(res.token);
        await refreshAuth();
        handleClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSwitching(null);
    }
  };

  const handleAddNew = async () => {
    await addNewAccount();
    handleClose();
  };

  const renderRoleIcon = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'student': return <GraduationCap size={20} color={Theme.colors.primary} />;
      case 'teacher':
      case 'staff': return <ShieldCheck size={20} color={Theme.colors.success} />;
      default: return <User size={20} color={Theme.colors.textSec} />;
    }
  };

  const getInitials = (name?: string) => {
    if (!name) { return ''; }
    const parts = name.trim().split(' ');
    if (parts.length === 1) { return parts[0].slice(0, 2).toUpperCase(); }
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const renderAvatar = (account: any, size = 56) => {
    const bg = account?.avatar_bg || '#eef2ff';
    if (account?.avatar) {
      return <Image source={{ uri: account.avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
    }
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: Theme.colors.text, fontWeight: '700' }}>{getInitials(account?.name || account?.student_full_name)}</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
          <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]} />
        </Pressable>

        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }], opacity: opacityAnim }]}>
          <View style={styles.dragHandle} />

          <View style={styles.cardHeader}>
            <Text style={styles.title}>Switch Account</Text>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* CURRENT ACTIVE ACCOUNT */}
            <View style={styles.sectionCard}>
              <TouchableOpacity style={styles.accountRow} onPress={handleClose} activeOpacity={0.8}>
                {renderAvatar({ name: userName, avatar_bg: '#ede9fe' }, 48)}
                <View style={styles.itemInfoSmall}>
                  <Text style={styles.itemName}>{userName}</Text>
                  <Text style={styles.roleBadge}>{userRole?.toUpperCase()}</Text>
                </View>
                <View style={styles.checkWrapper}>
                  <Check size={20} color={Theme.colors.primary} />
                </View>
              </TouchableOpacity>
            </View>

            {/* OTHER SESSIONS / LINKED PROFILES */}
            {(() => {
              const combined = buildCombinedOthers(savedAccounts || [], linkedProfiles || [], userToken || undefined, currentRoll);
              if (combined.length === 0) { return null; }
              return (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Other Active Sessions</Text>
                  {combined.map(entry => {
                    if (entry.type === 'saved') {
                      const account = entry.data;
                      const isActive = account.token === userToken;
                      if (isActive) { return null; }
                      return (
                        <TouchableOpacity
                          key={`saved-${entry.key}`}
                          style={styles.item}
                          onPress={() => handleSwitchSaved(account)}
                          disabled={!!switching}
                          activeOpacity={0.7}
                        >
                          {renderAvatar(account, 48)}
                          <View style={styles.itemInfo}>
                            <Text style={styles.itemName}>{account.name}</Text>
                            <Text style={styles.itemRole}>{account.schoolCode} • {account.role?.toUpperCase()}</Text>
                          </View>
                          <View style={styles.actionWrapper}>
                            {switching === account.id ? (
                              <ActivityIndicator size="small" color={Theme.colors.primary} />
                            ) : (
                              <TouchableOpacity onPress={() => logoutAccount(account.id)} style={styles.removeBtn}>
                                <LogOut size={16} color={Theme.colors.error} />
                              </TouchableOpacity>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    }

                    // Linked Profile (Family)
                    const profile = entry.data;
                    return (
                      <TouchableOpacity
                        key={`linked-${entry.key}`}
                        style={styles.item}
                        onPress={() => handleSwitchLinked(profile)}
                        disabled={!!switching}
                        activeOpacity={0.7}
                      >
                        {renderAvatar(profile, 48)}
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName}>{profile.student_full_name}</Text>
                          <Text style={styles.itemRole}>{profile.class_grade} - {profile.section}</Text>
                        </View>
                        <View style={styles.actionWrapper}>
                          {switching === profile.roll_no ? (
                            <ActivityIndicator size="small" color={Theme.colors.primary} />
                          ) : (
                            <ChevronRight size={18} color="#94a3b8" />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })()}

            {/* LINKED PROFILES (Specifically fallback if needed for student family layout) */}
            {userRole?.toLowerCase() === 'student' && (linkedProfiles.length > 0 || loadingLinked) && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Linked Profiles (Family)</Text>
                {loadingLinked ? (
                  <ActivityIndicator style={{ marginVertical: 10 }} />
                ) : (
                  linkedProfiles.map(profile => (
                    <TouchableOpacity
                      key={profile.roll_no}
                      style={styles.item}
                      onPress={() => handleSwitchLinked(profile)}
                      disabled={!!switching}
                      activeOpacity={0.7}
                    >
                      {renderAvatar(profile, 48)}
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{profile.student_full_name}</Text>
                        <Text style={styles.itemRole}>{profile.class_grade} - {profile.section}</Text>
                      </View>
                      <View style={styles.actionWrapper}>
                        {switching === profile.roll_no ? (
                          <ActivityIndicator size="small" color={Theme.colors.primary} />
                        ) : (
                          <ChevronRight size={18} color="#94a3b8" />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </ScrollView>

          <View style={styles.footerCard}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleAddNew}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryText}>LOG INTO ANOTHER ACCOUNT</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => {/* Register flow */ }} style={{ marginTop: 12 }}>
              <Text style={styles.registerText}>New Institution? <Text style={{ color: Theme.colors.primary, fontWeight: '700' }}>Register Now</Text></Text>
            </TouchableOpacity>

            <Text style={styles.helpText}>Need help?{'\n'}support@attendx.ai</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end', // Align bottom sheet to the bottom
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)', // Slightly darker overlay for premium depth
  },
  sheet: {
    backgroundColor: Theme.colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    width: '100%',
    maxHeight: SCREEN_H * 0.80,
    paddingBottom: 36, // Safe area space
    paddingTop: Theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 24,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1', // Slate 300
    alignSelf: 'center',
    marginTop: Theme.spacing.xs,
    marginBottom: Theme.spacing.sm,
  },
  cardHeader: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0', // Slate 200 divider
    marginBottom: Theme.spacing.md,
  },
  title: {
    ...Theme.typography.h3,
    color: '#0f172a',
    fontWeight: '700',
  },
  scroll: {
    paddingHorizontal: Theme.spacing.lg,
  },
  sectionCard: {
    marginBottom: Theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Theme.spacing.md,
    marginTop: Theme.spacing.xs,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: 16,
    backgroundColor: '#f8fafc', // Light elegant background for current account
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  itemInfoSmall: {
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  roleBadge: {
    ...Theme.typography.caption,
    color: Theme.colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  checkWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#f1f5f9',
  },
  itemInfo: {
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  itemName: {
    ...Theme.typography.h4,
    color: '#0f172a',
    fontWeight: '600',
  },
  itemRole: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  actionWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: Theme.spacing.sm,
  },
  removeBtn: {
    padding: Theme.spacing.sm,
  },
  footerCard: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#0f172a', // Dark charcoal/navy button matching Instagram premium look
    paddingVertical: 15,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryText: {
    color: '#ffffff',
    fontWeight: '700',
    letterSpacing: 0.5,
    fontSize: 14,
  },
  registerText: {
    color: '#64748b',
    ...Theme.typography.body,
  },
  helpText: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: Theme.spacing.md,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default AccountSwitcher;
