import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { AlertTriangle, ArrowLeft, CreditCard, Phone, Shield, Users } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';

import AppText from '../../components/common/AppText';

const fallbackMessage =
  "Your school access is currently blocked because the trial has expired or payment is due. Please contact your school administrator to renew access.";

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
      const role = await AsyncStorage.getItem('userRole');
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
      })
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDirector = userRole.toLowerCase() === 'director';

  return (
    <LinearGradient colors={['#eef2f7', '#e8edf5']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient colors={['#e84b2f', '#f97316', '#fbbf24']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.accentBar} />
          
          <View style={styles.innerCard}>
            <View style={styles.badgeContainer}>
              <View style={styles.badgeDot} />
              <AppText style={styles.badgeText}>ACCESS RESTRICTED</AppText>
            </View>
            
            <AppText style={styles.title}>Payment Due</AppText>
            <AppText style={styles.subtitle}>{message}</AppText>

            {schoolId ? (
              <View style={styles.institutionBox}>
                <LinearGradient colors={['#1e3a8a', '#2563eb']} style={styles.institutionIconBg}>
                  <Shield size={20} color="#fff" />
                </LinearGradient>
                <View style={styles.institutionTextWrap}>
                  <AppText style={styles.institutionLabel}>REGISTERED INSTITUTION</AppText>
                  <AppText style={styles.institutionId}>{schoolId}</AppText>
                </View>
              </View>
            ) : null}

            <View style={styles.divider} />

            <View style={styles.buttonsRow}>
              <TouchableOpacity 
                style={[styles.btn, styles.btnSecondary]} 
                onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}
              >
                <ArrowLeft size={16} color="#0f1629" />
                <AppText style={styles.btnSecondaryText}>Portal Login</AppText>
              </TouchableOpacity>

              {isDirector ? (
                <TouchableOpacity 
                  style={[styles.btn, styles.btnDirector]}
                  onPress={() => navigation.navigate('RenewalPayment')}
                >
                  <CreditCard size={16} color="#fff" />
                  <AppText style={styles.btnDirectorText}>Pay Now</AppText>
                </TouchableOpacity>
              ) : (
                <View style={[styles.btn, styles.btnDisabled]}>
                  <Phone size={16} color="#94a3b8" />
                  <AppText style={styles.btnDisabledText}>Contact Admin</AppText>
                </View>
              )}
            </View>

            {!isDirector ? (
              <View style={[styles.notice, styles.noticeBlue]}>
                <View style={[styles.noticeIcon, styles.noticeIconBlue]}>
                  <Users size={16} color="#fff" />
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
                  <AlertTriangle size={16} color="#fff" />
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
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 24,
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
  },
  innerCard: {
    padding: 24,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff0ed',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ffd7d0',
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e84b2f',
    marginRight: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#e84b2f',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f1629',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7694',
    lineHeight: 22,
    marginBottom: 24,
  },
  institutionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f8fc',
    borderWidth: 1,
    borderColor: '#e4e8f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  institutionIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  institutionTextWrap: {
    flex: 1,
  },
  institutionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9ba3be',
    letterSpacing: 1,
    marginBottom: 4,
  },
  institutionId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f1629',
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#e4e8f0',
    marginBottom: 24,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
  },
  btnSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e4e8f0',
  },
  btnSecondaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f1629',
    marginLeft: 8,
  },
  btnDirector: {
    backgroundColor: '#6A5AF9',
  },
  btnDirectorText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 8,
  },
  btnDisabled: {
    backgroundColor: '#f1f5f9',
  },
  btnDisabledText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    marginLeft: 8,
  },
  notice: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
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
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  noticeIconBlue: {
    backgroundColor: '#2563eb',
  },
  noticeIconAmber: {
    backgroundColor: '#f59e0b',
  },
  noticeTextWrap: {
    flex: 1,
  },
  noticeTitleBlue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 4,
  },
  noticeBodyBlue: {
    fontSize: 12,
    color: '#3b5bcc',
    lineHeight: 18,
  },
  noticeTitleAmber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#b45309',
    marginBottom: 4,
  },
  noticeBodyAmber: {
    fontSize: 12,
    color: '#92400e',
    lineHeight: 18,
  },
});

export default PaymentDueScreen;
