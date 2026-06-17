import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import accountStorage, { StoredAccount } from '../../services/accountStorage';
import AccountCard from '../../components/AccountCard';
import GradientButton from '../../components/GradientButton';
import { useNavigation } from '@react-navigation/native';

const AccountSwitcherScreen: React.FC = () => {
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);
  const navigation: any = useNavigation();
  const { switchToAccount } = useAuth();

  useEffect(() => {
    const load = async () => setAccounts(await accountStorage.getAccounts());
    load();
  }, []);

  const handleDelete = (acc: StoredAccount) => {
    Alert.alert('Remove account', `Remove ${acc.username}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => setAccounts(await accountStorage.deleteAccount(acc)),
      },
    ]);
  };

  const handleLogin = async (acc: StoredAccount) => {
    // attempt quick switch via auth context
    const ok = await switchToAccount(acc as any);
    if (!ok) {
      Alert.alert('Switch failed', 'Could not switch to this account. Try manual login.');
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Switch Account</Text>
      <Text style={styles.subtitle}>Select an account to log in</Text>

      <FlatList
        data={accounts}
        keyExtractor={i => `${i.schoolId}-${i.username}`}
        renderItem={({ item }) => (
          <AccountCard account={item} onPress={handleLogin} onDelete={handleDelete} />
        )}
        contentContainerStyle={{ paddingVertical: 12 }}
      />

      <View style={styles.bottom}>
        <GradientButton text="LOG INTO ANOTHER ACCOUNT" onPress={() => navigation.navigate('Login')} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F7FC', padding: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { color: '#8B9BB4', marginTop: 6, marginBottom: 12 },
  bottom: { marginTop: 'auto' },
});

export default AccountSwitcherScreen;
