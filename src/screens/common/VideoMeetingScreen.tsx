import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { JitsiMeeting } from '@jitsi/react-native-sdk';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

type VideoMeetingRouteProp = RouteProp<{
  VideoMeeting: {
    roomName: string;
    displayName?: string;
    subject?: string;
  }
}, 'VideoMeeting'>;

const VideoMeetingScreen = () => {
  const jitsiMeeting = useRef(null);
  const navigation = useNavigation();
  const route = useRoute<VideoMeetingRouteProp>();
  const { roomName, displayName, subject } = route.params;

  const onReadyToClose = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <JitsiMeeting
        eventListeners={{
          onReadyToClose,
          onConferenceJoined: () => console.log('Conference joined'),
          onConferenceTerminated: onReadyToClose,
        }}
        ref={jitsiMeeting}
        style={styles.jitsiView}
        room={roomName}
        config={{
          subject: subject || 'Meeting',
          displayName: displayName || 'User',
          startWithAudioMuted: true,
          startWithVideoMuted: true,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  jitsiView: {
    flex: 1,
  },
});

export default VideoMeetingScreen;
