import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import StandardPageHeader from '../../components/layout/StandardPageHeader';
import { innerPageLayoutStyles } from '../../components/layout/innerPageLayoutStyles';
import { storage } from '../../storage/storage';
import { StorageKeys } from '../../storage/StorageKeys';
import {
  BulkPayrollTab,
  HoursBasedPayrollTab,
  IndividualPayrollTab,
  PayrollTabBar,
  payrollStyles as styles,
} from '../../components/accountant/payroll';

export default function PayrollScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [activeTab, setActiveTab] = useState('bulk');
  const [schoolCode, setSchoolCode] = useState('');
  const [companyName, setCompanyName] = useState('School');
  const isTabRoot = route.name === 'Payroll';

  useEffect(() => {
    (async () => {
      const code = await storage.getString(StorageKeys.SCHOOL_CODE) || '';
      setSchoolCode(code);
      const name = await AsyncStorage.getItem('company_name') || await AsyncStorage.getItem('school_name') || 'School';
      setCompanyName(name);
    })();
  }, []);

  const pageChrome = (
    <>
      <StandardPageHeader
        scrollWithContent
        title="Staff Payroll"
        subtitle="Calculate and manage salaries"
        onBackPress={() => navigation.goBack()}
        showBack={!isTabRoot}
        containerStyle={innerPageLayoutStyles.scrollHeaderBleed}
      />
      <PayrollTabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </>
  );

  return (
    <View style={styles.mainContainer}>
      <View style={styles.tabContentArea}>
        {activeTab === 'bulk' && (
          <BulkPayrollTab schoolCode={schoolCode} companyName={companyName} pageChrome={pageChrome} />
        )}
        {activeTab === 'individual' && (
          <IndividualPayrollTab schoolCode={schoolCode} companyName={companyName} pageChrome={pageChrome} />
        )}
        {activeTab === 'hours' && (
          <HoursBasedPayrollTab schoolCode={schoolCode} companyName={companyName} pageChrome={pageChrome} />
        )}
      </View>
    </View>
  );
}
