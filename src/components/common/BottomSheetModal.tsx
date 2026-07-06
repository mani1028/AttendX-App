import React, { forwardRef, useCallback, useMemo } from 'react';
import { StyleSheet, StyleProp, ViewStyle, Platform, View } from 'react-native';
import { BottomSheetModal as GorhomBottomSheetModal, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../../theme/tokens';

type Props = {
  visible: boolean; // Note: to use this declaratively like before, we use useEffect to present/dismiss
  onClose: () => void;
  children: React.ReactNode;
  sheetStyle?: StyleProp<ViewStyle>;
  backdropColor?: string;
  animationType?: 'none' | 'slide' | 'fade'; // Ignored by Gorhom but kept for prop compat
  snapPoints?: Array<string | number>;
};

export default function BottomSheetModal({
  visible,
  onClose,
  children,
  sheetStyle,
  backdropColor = 'rgba(0, 0, 0, 0.6)',
  snapPoints: providedSnapPoints,
}: Props) {
  const insets = useSafeAreaInsets();
  const bottomSheetModalRef = React.useRef<GorhomBottomSheetModal>(null);

  const snapPoints = useMemo(() => providedSnapPoints || ['50%', '85%'], [providedSnapPoints]);

  React.useEffect(() => {
    if (visible) {
      bottomSheetModalRef.current?.present();
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [visible]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.6}
        pressBehavior="close"
      />
    ),
    []
  );

  return (
    <GorhomBottomSheetModal
      ref={bottomSheetModalRef}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: '#CBD5E1', width: 40 }}
      backgroundStyle={styles.backgroundStyle}
    >
      <BottomSheetView style={[styles.contentContainer, { paddingBottom: insets.bottom + 16 }, sheetStyle]}>
        {children}
      </BottomSheetView>
    </GorhomBottomSheetModal>
  );
}

const styles = StyleSheet.create({
  backgroundStyle: {
    backgroundColor: Theme.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: Theme.spacing.md,
  },
});
