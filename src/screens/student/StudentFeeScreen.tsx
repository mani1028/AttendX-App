import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import ScreenContainer from '../../components/ScreenContainer';
import { colors } from '../../constants/theme';
import { getStudentFee } from '../../services/studentService';

type FeeState = {
  totalFee: number;
  paidFee: number;
  pendingFee: number;
};

function formatRupee(value: number) {
  return `Rs ${value.toLocaleString('en-IN')}`;
}

export default function StudentFeeScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fee, setFee] = useState<FeeState | null>(null);

  useEffect(() => {
    const loadFee = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const data = await getStudentFee();
        setFee(data);
      } catch {
        setErrorMessage('Could not load fee data.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadFee();
  }, []);

  return (
    <ScreenContainer>
      <View style={styles.card}>
        <Text style={styles.heading}>Fee Summary</Text>
        {isLoading ? <Text style={styles.line}>Loading fee details...</Text> : null}
        {!isLoading && errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        {!isLoading && !errorMessage && fee ? (
          <>
            <Text style={styles.line}>Total Fee: {formatRupee(fee.totalFee)}</Text>
            <Text style={styles.line}>Paid: {formatRupee(fee.paidFee)}</Text>
            <Text style={styles.pending}>Pending: {formatRupee(fee.pendingFee)}</Text>
          </>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  line: {
    color: colors.textMuted,
    fontSize: 15,
  },
  pending: {
    color: '#b45309',
    fontWeight: '700',
    fontSize: 15,
  },
  error: {
    color: '#b91c1c',
    fontSize: 15,
  },
});