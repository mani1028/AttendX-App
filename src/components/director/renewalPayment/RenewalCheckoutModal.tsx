import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { WebView } from 'react-native-webview';
import { ChevronLeft } from 'lucide-react-native';
import ScreenSkeleton from '../../common/ScreenSkeleton';
import { Theme } from '../../../theme/tokens';
import { renewalPaymentStyles as styles } from './renewalPaymentStyles';
import { getCheckoutHtml } from './helpers';

export interface RenewalCheckoutModalProps {
  visible: boolean;
  checkoutData: {
    key: string;
    amount: number;
    orderId: string;
    subscriptionId: string;
    description: string;
    email: string;
  } | null;
  topInset: number;
  onClose: () => void;
  onMessage: (event: any) => void;
}

export default function RenewalCheckoutModal({
  visible,
  checkoutData,
  topInset,
  onClose,
  onMessage,
}: RenewalCheckoutModalProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: Theme.colors.background, paddingTop: topInset }}>
        <View style={styles.webViewHeader}>
          <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.webViewCloseBtn}>
            <ChevronLeft size={24} color={Theme.colors.text} />
            <Text style={styles.webViewCloseTxt}>Cancel Payment</Text>
          </TouchableOpacity>
        </View>
        <WebView
          originWhitelist={['*']}
          source={{ html: getCheckoutHtml(checkoutData) }}
          onMessage={onMessage}
          style={{ flex: 1 }}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => <ScreenSkeleton variant="list" />}
        />
      </View>
    </Modal>
  );
}
