import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Modal } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationPanel from '../common/NotificationPanel';
import CalendarView from '../common/CalendarView';
import { colors } from '../../constants/colors';

// Menu items per role (simplified)
const MENU_CONFIG: Record<string, any> = {
  admin: { label: 'Global Admin', menu: [{ title: 'Schools', route: 'AdminDashboard' }] },
  principal: { label: 'Principal', menu: [{ title: 'Dashboard', route: 'PrincipalDashboard' }, { title: 'Branches', route: 'PrincipalDashboard' }] },
  hm: { label: 'Head Master', menu: [{ title: 'Dashboard', route: 'HMDashboard' }, { title: 'Staff', route: 'TeacherManagement' }, { title: 'Students', route: 'StudentManagement' }, { title: 'Attendance', route: 'HMAttendance' }] },
  teacher: { label: 'Teacher', menu: [{ title: 'Attendance', route: 'TeacherAttendance' }, { title: 'Marks', route: 'MarksEntry' }, { title: 'Homework', route: 'HomeworkManagement' }, { title: 'Leaves', route: 'LeaveApproval' }] },
  student: { label: 'Student', menu: [{ title: 'Attendance', route: 'StudentAttendance' }, { title: 'Marks', route: 'StudentMarks' }, { title: 'Homework', route: 'StudentHomework' }, { title: 'Leave', route: 'StudentLeave' }, { title: 'Fees', route: 'StudentFee' }] },
  accountant: { label: 'Accountant', menu: [{ title: 'Dashboard', route: 'AccountantDashboard' }, { title: 'Fees', route: 'FeeManagement' }, { title: 'Payroll', route: 'Payroll' }] },
};

export default function SchoolUnifiedLayout({ children, role }: { children: React.ReactNode; role: string }) {
  const navigation = useNavigation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [userName, setUserName] = useState('');
  const [schoolCode, setSchoolCode] = useState('');

  useEffect(() => {
    const load = async () => {
      const name = await AsyncStorage.getItem('user_name');
      const code = await AsyncStorage.getItem('school_code');
      setUserName(name || 'User');
      setSchoolCode(code || '');
    };
    load();
  }, []);

  const config = MENU_CONFIG[role] || MENU_CONFIG.hm;

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['token', 'user_role', 'user_name', 'school_code', 'branch_id']);
    navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setDrawerOpen(true)} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{config.label}</Text>
        <View style={styles.rightIcons}>
          {(role === 'student' || role === 'teacher') && (
            <TouchableOpacity onPress={() => setShowCalendar(true)} style={styles.iconBtn}>
              <Text>📅</Text>
            </TouchableOpacity>
          )}
          <NotificationPanel type={role} />
        </View>
      </View>

      <ScrollView style={styles.content}>{children}</ScrollView>

      {/* Drawer */}
      <Modal visible={drawerOpen} transparent animationType="slide">
        <TouchableOpacity style={styles.drawerOverlay} activeOpacity={1} onPress={() => setDrawerOpen(false)}>
          <View style={styles.drawer}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerName}>{userName}</Text>
              <Text style={styles.drawerRole}>{config.label}</Text>
              {schoolCode && <Text style={styles.schoolCode}>🏫 {schoolCode}</Text>}
            </View>
            <ScrollView>
              {config.menu.map((item: any) => (
                <TouchableOpacity
                  key={item.title}
                  style={styles.drawerItem}
                  onPress={() => {
                    setDrawerOpen(false);
                    navigation.navigate(item.route as never);
                  }}
                >
                  <Text style={styles.drawerItemText}>{item.title}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.drawerItem, styles.logoutItem]} onPress={handleLogout}>
                <Text style={styles.logoutText}>Sign Out</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showCalendar} transparent animationType="fade">
        <View style={styles.calendarOverlay}>
          <View style={styles.calendarModal}>
            <CalendarView />
            <TouchableOpacity style={styles.closeCalendar} onPress={() => setShowCalendar(false)}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  menuBtn: { padding: 8 },
  menuIcon: { fontSize: 20 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  rightIcons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: { padding: 8 },
  content: { flex: 1, padding: 16 },
  drawerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start' },
  drawer: { width: '70%', maxWidth: 280, height: '100%', backgroundColor: '#0f172a', paddingTop: 40 },
  drawerHeader: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  drawerName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  drawerRole: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  schoolCode: { fontSize: 10, color: '#3b82f6', marginTop: 8 },
  drawerItem: { paddingVertical: 12, paddingHorizontal: 20 },
  drawerItemText: { color: '#e2e8f0', fontSize: 14 },
  logoutItem: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#1e293b' },
  logoutText: { color: '#ef4444' },
  calendarOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  calendarModal: { backgroundColor: '#fff', borderRadius: 16, width: '90%', maxHeight: '80%', padding: 16 },
  closeCalendar: { marginTop: 16, alignItems: 'center' },
  closeText: { color: '#3b82f6', fontWeight: '600' },
});