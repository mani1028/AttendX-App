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

  const slideAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Fetch linked profiles if student
      if (userRole?.toLowerCase() === 'student') {
        fetchLinked();
      }

      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 1, friction: 10, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0.95, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  // Build a combined list of other accounts (saved sessions + linked profiles), deduped
  const buildCombinedOthers = (saved: any[], linked: any[], currentToken?: string, currentRoll?: string) => {
    const map = new Map<string, any>();

    // Add saved accounts first
    for (const acc of saved || []) {
      if (!acc || !acc.token) {continue;}
      // Use account id if present, else fallback to token
      const key = String(acc.id ?? acc.token).trim();
      if (!key) {continue;}
      // Skip current active session
      if (acc.token && currentToken && acc.token === currentToken) {continue;}
      map.set(key, { type: 'saved', key, data: acc });
    }

    // Add linked profiles, keyed by roll_no to avoid duplicates
    for (const p of linked || []) {
      const roll = String(p?.roll_no ?? p?.student_id ?? '').trim();
      if (!roll) {continue;}
      if (roll && currentRoll && roll === currentRoll) {continue;}
      // If saved session already exists for same roll, skip adding linked duplicate
      if (Array.from(map.values()).some(v => v.type === 'saved' && String(v.data?.student_id ?? v.data?.roll_no ?? '') === roll)) {
        continue;
      }
      if (!map.has(roll)) {map.set(roll, { type: 'linked', key: roll, data: p });}
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
        if (!roll) {continue;}
        if (roll === String(currentRollLocal)) {continue;}
        if (!map.has(roll)) {map.set(roll, p);}
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
    if (success) {onClose();}
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
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSwitching(null);
    }
  };

  const handleAddNew = () => {
    addNewAccount();
    onClose();
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
    if (!name) {return '';}
    const parts = name.trim().split(' ');
    if (parts.length === 1) {return parts[0].slice(0,2).toUpperCase();}
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
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]} />
        </Pressable>

        <Animated.View style={[styles.sheet, { transform: [{ scale: slideAnim }], opacity: opacityAnim }]}>
          <View style={styles.topAccent} pointerEvents="none">
            <View style={styles.topAccentLeft} />
            <View style={styles.topAccentRight} />
          </View>
          <View style={styles.cardHeader}>
            <View style={styles.headerIcon}><Users size={20} color={Theme.colors.card} /></View>
            <Text style={styles.title}>Switch Account</Text>
            <Text style={styles.subtitle}>Select an account to log in</Text>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Instagram-like horizontal avatars */}
            {(() => {
              const combined = buildCombinedOthers(savedAccounts || [], linkedProfiles || [], userToken || undefined, currentRoll);
              if (combined.length === 0) {return null;}
              return (
                <View style={{ paddingVertical: Theme.spacing.sm }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Theme.spacing.sm }}>
                    {combined.map(entry => {
                      const account = entry.data;
                      const key = entry.key;
                      const isActive = (account.token && account.token === userToken) || false;
                      return (
                        <TouchableOpacity key={key} style={{ alignItems: 'center', marginHorizontal: Theme.spacing.sm }} onPress={() => entry.type === 'saved' ? handleSwitchSaved(account) : handleSwitchLinked(account)}>
                          <View style={[styles.avatarRing, isActive ? styles.avatarRingActive : null]}>
                            <View style={styles.avatarWrapper}>
                              {renderAvatar(account, 64)}
                              {isActive && (
                                <View style={styles.avatarBadge}>
                                  <Check size={12} color={Theme.colors.card} />
                                </View>
                              )}
                            </View>
                          </View>
                          <Text style={{ marginTop: Theme.spacing.sm, fontSize: 13, color: '#1e293b', fontWeight: '600' }} numberOfLines={1}>{account.name || account.student_full_name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              );
            })()}
            {/* Single-line account list similar to web design */}
            {/* CURRENT ACCOUNT */}
            <View style={styles.sectionCard}>
              <View style={styles.accountRow}>
                <View style={[styles.avatarContainer, { width: 64, height: 64, borderRadius: 32 }]}>
                  <User size={28} color={Theme.colors.card} />
                </View>
                <View style={styles.itemInfoSmall}>
                  <Text style={styles.itemName}>{userName}</Text>
                  <Text style={styles.roleBadge}>{userRole?.toUpperCase()}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Check size={20} color={Theme.colors.primary} />
                </View>
              </View>
            </View>

            {/* OTHER ACCOUNTS: merge saved sessions + linked family profiles (deduped) */}
            {(() => {
              const combined = buildCombinedOthers(savedAccounts || [], linkedProfiles || [], userToken || undefined, currentRoll);
              if (combined.length === 0) {return null;}
              return (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Other Active Sessions</Text>
                  {combined.map(entry => {
                    if (entry.type === 'saved') {
                      const account = entry.data;
                      const isActive = account.token === userToken;
                      if (isActive) {return null;}
                      return (
                        <TouchableOpacity
                          key={`saved-${entry.key}`}
                          style={styles.item}
                          onPress={() => handleSwitchSaved(account)}
                          disabled={!!switching}
                        >
                          <View style={[styles.avatarSmall, { backgroundColor: Theme.colors.background }]}>
                            {renderRoleIcon(account.role)}
                          </View>
                          <View style={styles.itemInfo}>
                            <Text style={styles.itemName}>{account.name}</Text>
                            <Text style={styles.itemRole}>{account.schoolCode} • {account.role?.toUpperCase()}</Text>
                          </View>
                          {switching === account.id ? (
                            <ActivityIndicator size="small" color={Theme.colors.primary} />
                          ) : (
                            <TouchableOpacity onPress={() => logoutAccount(account.id)}>
                              <LogOut size={16} color={Theme.colors.error} />
                            </TouchableOpacity>
                          )}
                        </TouchableOpacity>
                      );
                    }

                    // linked profile
                    const profile = entry.data;
                    return (
                      <TouchableOpacity
                        key={`linked-${entry.key}`}
                        style={styles.item}
                        onPress={() => handleSwitchLinked(profile)}
                        disabled={!!switching}
                      >
                        <View style={[styles.avatarSmall, { backgroundColor: '#eef2ff' }]}>
                          <Users size={18} color={Theme.colors.primary} />
                        </View>
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName}>{profile.student_full_name}</Text>
                          <Text style={styles.itemRole}>{profile.class_grade} - {profile.section}</Text>
                        </View>
                        {switching === profile.roll_no ? (
                          <ActivityIndicator size="small" color={Theme.colors.primary} />
                        ) : (
                          <ChevronRight size={18} color="#94a3b8" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })()}

            {/* LINKED PROFILES (For Students/Parents) */}
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
                    >
                      <View style={[styles.avatarSmall, { backgroundColor: '#eef2ff' }]}>
                        <Users size={18} color={Theme.colors.primary} />
                      </View>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{profile.student_full_name}</Text>
                        <Text style={styles.itemRole}>{profile.class_grade} - {profile.section}</Text>
                      </View>
                      {switching === profile.roll_no ? (
                        <ActivityIndicator size="small" color={Theme.colors.primary} />
                      ) : (
                        <ChevronRight size={18} color="#94a3b8" />
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

          </ScrollView>

          <View style={styles.footerCard}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => { onClose(); (navigation as any).navigate('Login'); }}
            >
              <Text style={styles.primaryText}>LOG INTO ANOTHER ACCOUNT</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => {/* Register flow */}} style={{ marginTop: 12 }}>
              <Text style={styles.registerText}>New Institution? <Text style={{ color: Theme.colors.primary, fontWeight: '700' }}>Register Now</Text></Text>
            </TouchableOpacity>

            <Text style={styles.helpText}>Need help?{'\n'}support@attendx.in</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: Theme.colors.background,
    borderRadius: 20,
    marginHorizontal: Theme.spacing.lg,
    maxHeight: SCREEN_H * 0.86,
    paddingBottom: 20,
    paddingTop: Theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 10,
  },
  topAccent: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -6,
    height: 8,
    flexDirection: 'row',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  topAccentLeft: {
    flex: 1,
    backgroundColor: '#7c3aed',
  },
  topAccentRight: {
    flex: 1,
    backgroundColor: '#06b6d4',
  },
  cardHeader: {
    alignItems: 'center',
    paddingHorizontal: 28,
    marginBottom: 6,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  title: {
    ...Theme.typography.h3,
    color: '#1e293b',
  },
  subtitle: {
    ...Theme.typography.caption,
    color: '#94a3b8',
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  scroll: {
    paddingHorizontal: 28,
    paddingVertical: Theme.spacing.sm,
  },
  sectionCard: {
    marginBottom: 18,
    paddingHorizontal: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  activeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eef2ff',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.background,
  },
  itemInfoSmall: {
    flex: 1,
  },
  roleBadge: {
    ...Theme.typography.caption,
    color: '#94a3b8',
    marginTop: Theme.spacing.xs,
  },
  removeBtn: {
    padding: Theme.spacing.sm,
    marginLeft: Theme.spacing.sm,
  },
  avatarRing: {
    padding: Theme.spacing.xs,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarRingActive: {
    borderColor: Theme.colors.primary,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Theme.colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Theme.colors.card,
  },
  avatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...Theme.typography.h4,
    color: '#1e293b',
  },
  itemRole: {
    fontSize: 13,
    color: Theme.colors.textSec,
    marginTop: 2,
  },
  activeText: {
    color: Theme.colors.primary,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: Theme.spacing.sm,
  },
  addButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: 12,
    backgroundColor: Theme.colors.background,
  },
  addIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addText: {
    ...Theme.typography.h4,
    color: Theme.colors.textSec,
  },
  footer: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  footerCard: {
    paddingHorizontal: 28,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: Theme.colors.text,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  primaryText: {
    color: Theme.colors.card,
    letterSpacing: 2,
    ...Theme.typography.bodyMd,
  },
  registerText: {
    color: '#94a3b8',
    ...Theme.typography.body,
  },
  helpText: {
    color: Theme.colors.textSec,
    fontSize: 13,
    marginTop: 18,
    textAlign: 'center',
  },
});

export default AccountSwitcher;
