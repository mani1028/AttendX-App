import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { colors } from '../../constants/colors';
import AppButton from '../../components/common/AppButton';
import AppCard from '../../components/common/AppCard';

// Helper function to format visitor number
const formatVisitorNo = (visitorNo: string): string => {
  if (!visitorNo || visitorNo === 'N/A') return 'N/A';
  // Format as XXX-XXX-XXX if needed
  if (visitorNo.length === 9) {
    return `${visitorNo.slice(0, 3)}-${visitorNo.slice(3, 6)}-${visitorNo.slice(6, 9)}`;
  }
  return visitorNo;
};

export default function VisitSuccessScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  
  // Get visitor number from route params
  const visitorNo = (route.params as any)?.visitor_no || 'N/A';
  const formattedVisitorNo = formatVisitorNo(visitorNo);

  // Auto redirect after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Login' as any);
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Main Card */}
      <AppCard style={styles.card}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.successIcon}>✅</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Registration Submitted!</Text>

        {/* Message */}
        <Text style={styles.message}>
          Your visitor registration has been successfully submitted. Please wait for approval at the office.
        </Text>

        {/* Visitor Number Section */}
        <View style={styles.visitorNumberContainer}>
          <Text style={styles.visitorNumberLabel}>Your Visitor Number</Text>
          <Text style={styles.visitorNumberValue}>{formattedVisitorNo}</Text>
        </View>

        {/* Instructions Section */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Next Steps:</Text>
          <View style={styles.instructionsList}>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionBullet}>✓</Text>
              <Text style={styles.instructionText}>Proceed to the main office</Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionBullet}>✓</Text>
              <Text style={styles.instructionText}>Wait for staff approval</Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionBullet}>✓</Text>
              <Text style={styles.instructionText}>You will be guided to your destination</Text>
            </View>
          </View>
        </View>

        {/* Buttons */}
        <AppButton
          title="Go to Home"
          onPress={() => navigation.replace('Login' as any)}
          style={styles.homeBtn}
        />

        {/* Redirect Message */}
        <Text style={styles.redirectText}>
          Redirecting automatically in a few seconds...
        </Text>
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  iconContainer: {
    marginBottom: 20,
  },
  successIcon: {
    fontSize: 64,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#059669',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: '#4a5568',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  visitorNumberContainer: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  visitorNumberLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  visitorNumberValue: {
    fontSize: 24,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 1,
  },
  instructionsContainer: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e3a8a',
    marginBottom: 12,
  },
  instructionsList: {
    gap: 10,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  instructionBullet: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  instructionText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  homeBtn: {
    width: '100%',
    marginBottom: 16,
  },
  redirectText: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
  },
});