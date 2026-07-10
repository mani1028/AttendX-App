import React from 'react';
import { View, Text, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { C } from '../../../theme/tokens';
import { leaveStyles as styles } from './leaveStyles';

interface LeaveSuccessModalProps {
    visible: boolean;
}

export default function LeaveSuccessModal({ visible }: LeaveSuccessModalProps) {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlayCenter}>
                <View style={styles.successModal}>
                    <View style={styles.successIconContainer}>
                        <Icon name="check-circle" size={48} color={C.colors.success} />
                    </View>
                    <Text style={styles.successTitle}>Request Submitted!</Text>
                    <Text style={styles.successMessage}>
                        Your leave request has been submitted successfully and is pending approval.
                    </Text>
                </View>
            </View>
        </Modal>
    );
}
