import { Theme } from '../../theme/tokens';
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { AlertTriangle, ChevronLeft, CreditCard, Phone, Shield, Users } from 'lucide-react-native';

import AppText from '../../components/common/AppText';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';


const fallbackMessage =
  'Your school access is currently blocked because the trial has expired or payment is due. Please contact your school administrator to renew access.';

const PaymentDueScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const message = route.params?.message || fallbackMessage;
  const schoolId = route.params?.schoolId || '';

  const [userRole, setUserRole] = useState<string>('');

  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(20);

  useEffect(() => {
    const fetchRole = async () => {
      const role = await storage.getString(StorageKeys.USER_ROLE);
      setUserRole(role || '');
    };
    fetchRole();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDirector = userRole.toLowerCase() === 'director';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.accentBar} />

          <View style={styles.innerCard}>
            <View style={styles.badgeContainer}>
              <View style={styles.badgeDot} />
              <AppText style={styles.badgeText}>ACCESS RESTRICTED</AppText>
            </View>

            <AppText style={styles.title}>Payment Due</AppText>
            <AppText style={styles.subtitle}>{message}</AppText>

            {schoolId ? (
              <View style={styles.institutionBox}>
                <View style={styles.institutionIconBg}>
                  <Shield size={20} color={Theme.colors.card} />
                </View>
                <View style={styles.institutionTextWrap}>
                  <AppText style={styles.institutionLabel}>REGISTERED INSTITUTION</AppText>
                  <AppText style={styles.institutionId}>{schoolId}</AppText>
                </View>
              </View>
            ) : null}

            <View style={styles.divider} />

            <View style={styles.buttonsRow}>
              <TouchableOpacity accessibilityRole="button"
                style={[styles.btn, styles.btnSecondary]}
                onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}
              >
                <ChevronLeft size={16} color="#0f1629" />
                <AppText style={styles.btnSecondaryText}>Portal Login</AppText>
              </TouchableOpacity>

              {isDirector ? (
                <TouchableOpacity accessibilityRole="button"
                  style={[styles.btn, styles.btnDirector]}
                  onPress={() => navigation.navigate('RenewalPayment')}
                >
                  <CreditCard size={16} color={Theme.colors.card} />
                  <AppText style={styles.btnDirectorText}>Pay Now</AppText>
                </TouchableOpacity>
              ) : (
                <View style={[styles.btn, styles.btnDisabled]}>
                  <Phone size={16} color={Theme.colors.textMuted} />
                  <AppText style={styles.btnDisabledText}>Contact Admin</AppText>
                </View>
              )}
            </View>

            {!isDirector ? (
              <View style={[styles.notice, styles.noticeBlue]}>
                <View style={[styles.noticeIcon, styles.noticeIconBlue]}>
                  <Users size={16} color={Theme.colors.card} />
                </View>
                <View style={styles.noticeTextWrap}>
                  <AppText style={styles.noticeTitleBlue}>Director authority required.</AppText>
                  <AppText style={styles.noticeBodyBlue}>
                    Only the school owner can process institutional payments. Please coordinate with your primary administrator to restore platform access.
                  </AppText>
                </View>
              </View>
            ) : (
              <View style={[styles.notice, styles.noticeAmber]}>
                <View style={[styles.noticeIcon, styles.noticeIconAmber]}>
                  <AlertTriangle size={16} color={Theme.colors.card} />
                </View>
                <View style={styles.noticeTextWrap}>
                  <AppText style={styles.noticeTitleAmber}>Action required.</AppText>
                  <AppText style={styles.noticeBodyAmber}>
                    Academic activities are currently paused. Processing the outstanding balance will immediately reactivate all portal services.
                  </AppText>
                </View>
              </View>
            )}
          </View>
        </Animated.View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.backgroundAlt,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Theme.spacing.xl,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: Theme.radius.xxl,
    overflow: 'hidden',
    shadowColor: '#0f1629',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  accentBar: {
    height: 4,
    width: '100%',
    backgroundColor: Theme.colors.warning,
  },
  innerCard: {
    padding: Theme.spacing.lg,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff0ed',
    paddingVertical: 6,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.radius.xl,
    alignSelf: 'flex-start',
    marginBottom: Theme.spacing.xl,
    borderWidth: 1,
    borderColor: '#ffd7d0',
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e84b2f',
    marginRight: Theme.spacing.sm,
  },
  badgeText: {
    fontSize: Theme.typography.label.fontSize,
    fontWeight: '700',
    color: '#e84b2f',
    letterSpacing: 1,
  },
  title: {
    ...Theme.typography.h1,
    color: '#0f1629',
    marginBottom: Theme.spacing.sm,
  },
  subtitle: {
    ...Theme.typography.body,
    color: '#6b7694',
    lineHeight: 22,
    marginBottom: Theme.spacing.lg,
  },
  institutionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f8fc',
    borderWidth: 1,
    borderColor: '#e4e8f0',
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  institutionIconBg: {
    width: 40,
    height: 40,
    borderRadius: Theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
    backgroundColor: Theme.colors.primary,
  },
  institutionTextWrap: {
    flex: 1,
  },
  institutionLabel: {
    fontSize: Theme.typography.label.fontSize,
    fontWeight: '700',
    color: '#9ba3be',
    letterSpacing: 1,
    marginBottom: Theme.spacing.xs,
  },
  institutionId: {
    ...Theme.typography.h4,
    color: '#0f1629',
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#e4e8f0',
    marginBottom: Theme.spacing.lg,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.xl,
    gap: Theme.spacing.md,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Theme.radius.md,
  },
  btnSecondary: {
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: '#e4e8f0',
  },
  btnSecondaryText: {
    fontSize: Theme.typography.caption.fontSize,
    fontWeight: '700',
    color: '#0f1629',
    marginLeft: Theme.spacing.sm,
  },
  btnDirector: {
    backgroundColor: '#6A5AF9',
  },
  btnDirectorText: {
    fontSize: Theme.typography.caption.fontSize,
    fontWeight: '700',
    color: Theme.colors.card,
    marginLeft: Theme.spacing.sm,
  },
  btnDisabled: {
    backgroundColor: Theme.colors.background,
  },
  btnDisabledText: {
    fontSize: Theme.typography.caption.fontSize,
    fontWeight: '700',
    color: Theme.colors.textMuted,
    marginLeft: Theme.spacing.sm,
  },
  notice: {
    flexDirection: 'row',
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
  },
  noticeBlue: {
    backgroundColor: '#eff4ff',
    borderColor: '#bfdbfe',
  },
  noticeAmber: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  noticeIcon: {
    width: 32,
    height: 32,
    borderRadius: Theme.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  noticeIconBlue: {
    backgroundColor: Theme.colors.blue,
  },
  noticeIconAmber: {
    backgroundColor: Theme.colors.warning,
  },
  noticeTextWrap: {
    flex: 1,
  },
  noticeTitleBlue: {
    fontSize: Theme.typography.caption.fontSize,
    fontWeight: '700',
    color: Theme.colors.blue,
    marginBottom: Theme.spacing.xs,
  },
  noticeBodyBlue: {
    ...Theme.typography.caption,
    color: '#3b5bcc',
    lineHeight: 18,
  },
  noticeTitleAmber: {
    fontSize: Theme.typography.caption.fontSize,
    fontWeight: '700',
    color: '#b45309',
    marginBottom: Theme.spacing.xs,
  },
  noticeBodyAmber: {
    ...Theme.typography.caption,
    color: '#92400e',
    lineHeight: 18,
  },
});

export default PaymentDueScreen;
