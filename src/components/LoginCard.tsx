import { Theme } from '../theme/tokens';
import React from 'react';
import { View, StyleSheet } from 'react-native';

type Props = { children: React.ReactNode };

const LoginCard: React.FC<Props> = ({ children }) => {
  return <View style={styles.card}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: 30,
    padding: 20,
    shadowColor: '#6648dc',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 6,
    borderWidth: 1,
    borderColor: Theme.colors.background,
  },
});

export default LoginCard;
