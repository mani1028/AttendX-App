import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Modal, ScrollView, Image } from 'react-native';
import { Camera, XCircle } from 'lucide-react-native';
import AppText from '../../common/AppText';
import { Theme } from '../../../theme/tokens';
import { viewAttendanceStyles as styles } from './viewAttendanceStyles';

// Image Modal Component
const AttendanceImageModal: React.FC<{
  visible: boolean;
  images: string[];
  title: string;
  onClose: () => void;
}> = ({ visible, images, title, onClose }) => {
  const [activeIndex, setActiveIndex] = useState<number>(0);

  useEffect(() => {
    if (visible) {setActiveIndex(0);}
  }, [visible]);

  if (!visible) {return null;}

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.imageModalOverlay}>
        <View style={styles.imageModalContent}>
          <View style={styles.imageModalHeader}>
            <AppText style={styles.imageModalTitle}>{title}</AppText>
            <TouchableOpacity onPress={onClose} style={styles.imageModalClose}>
              <XCircle size={24} color={Theme.colors.textSec} />
            </TouchableOpacity>
          </View>

          <View style={styles.imageModalBody}>
            {images.length === 0 ? (
              <View style={styles.imageModalEmpty}>
                <Camera size={48} color={Theme.colors.textMuted} />
                <AppText style={styles.imageModalEmptyText}>No images found</AppText>
              </View>
            ) : (
              <>
                <Image source={{ uri: images[activeIndex] }} style={styles.imageModalMain} />
                {images.length > 1 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.imageModalThumbs]}>
                    {images.filter(Boolean).map((img, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.imageModalThumb, activeIndex === idx && styles.imageModalThumbActive]}
                        onPress={() => setActiveIndex(idx)}
                      >
                        <Image source={{ uri: img }} style={styles.imageModalThumbImg} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
                <AppText style={styles.imageModalCounter}>
                  Image {activeIndex + 1} of {images.length}
                </AppText>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};


export default AttendanceImageModal;
