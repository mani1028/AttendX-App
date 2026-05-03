import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

// Types
interface AvatarBubbleProps {
  size?: number; // Width and height in pixels
  textSize?: number; // Font size in pixels
  displayName: string;
  initials?: string;
  primaryColor?: string;
  primaryGlowColor?: string;
}

// Helper function to get initials
const getInitials = (
  displayName: string,
  defaultInitials: string = 'U'
): string => {
  if (!displayName) return defaultInitials;

  const nameParts = displayName.trim().split(' ');
  if (nameParts.length === 0) return defaultInitials;

  const initials = nameParts
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return initials || defaultInitials;
};

// Avatar Bubble Component
const AvatarBubble: React.FC<AvatarBubbleProps> = ({
  size = 36,
  textSize = 14,
  displayName,
  initials: customInitials,
  primaryColor = '#3b82f6',
  primaryGlowColor = 'rgba(59,130,246,0.22)',
}) => {
  const avatarInitials = customInitials || getInitials(displayName);

  return (
    <LinearGradient
      colors={[primaryColor, '#1d4ed8']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.avatarContainer,
        {
          width: size,
          height: size,
          borderRadius: size / 3, // Slightly rounded-xl style
          shadowColor: primaryGlowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 8,
          elevation: 5,
        },
      ]}
    >
      <Text
        style={[
          styles.avatarText,
          {
            fontSize: textSize,
            lineHeight: textSize + 2,
          },
        ]}
      >
        {avatarInitials}
      </Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default AvatarBubble;
