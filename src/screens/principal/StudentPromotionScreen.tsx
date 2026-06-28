import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AppText from '../../components/common/AppText';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { safeGoBack } from '../../utils/navigationHelpers';
import { Theme } from '../../theme/tokens';

export default function StudentPromotionScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <StandardPageHeader
        title="Student Promotion"
        subtitle="Promote students to the next academic year"
        onBackPress={() => safeGoBack(navigation as any, 'PrincipalDashboard')}
      />

      <ScrollView
        style={innerPageLayoutStyles.scrollViewFront}
        contentContainerStyle={innerPageLayoutStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={innerPageLayoutStyles.contentFront}>
          <AppText style={styles.title} weight="bold">Promote Students</AppText>
          <AppText style={styles.subtitle}>Promote students to the next academic year.</AppText>
          <View style={styles.card}>
            <AppText style={styles.cardText}>Promotion interface will be available here.</AppText>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  title: {
    fontSize: 22,
    color: Theme.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Theme.colors.textSec,
    marginBottom: 20,
  },
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  cardText: {
    fontSize: 14,
    color: Theme.colors.textSec,
    textAlign: 'center',
  },
});
