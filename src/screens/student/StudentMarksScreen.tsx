import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import ScreenContainer from '../../components/ScreenContainer';
import { colors } from '../../constants/theme';
import { getStudentMarks } from '../../services/studentService';

type MarkRow = {
  subject: string;
  score: number;
};

export default function StudentMarksScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [marks, setMarks] = useState<MarkRow[]>([]);

  useEffect(() => {
    const loadMarks = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const data = await getStudentMarks();
        setMarks(data.subjects);
      } catch {
        setErrorMessage('Could not load marks data.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadMarks();
  }, []);

  return (
    <ScreenContainer>
      <View style={styles.card}>
        <Text style={styles.heading}>Marks Overview</Text>
        {isLoading ? <Text style={styles.line}>Loading marks...</Text> : null}
        {!isLoading && errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        {!isLoading && !errorMessage
          ? marks.map(item => (
              <Text key={item.subject} style={styles.line}>
                {item.subject}: {item.score}
              </Text>
            ))
          : null}
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
  error: {
    color: '#b91c1c',
    fontSize: 15,
  },
});