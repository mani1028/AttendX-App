import { PermissionsAndroid, Platform } from 'react-native';
import { launchCamera as originalLaunchCamera, CameraOptions, ImagePickerResponse, launchImageLibrary } from 'react-native-image-picker';

export const launchCameraWithPermission = async (options: CameraOptions, callback: (response: ImagePickerResponse) => void) => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: "Camera Permission",
          message: "App needs camera permission to take photos",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK"
        }
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        callback({ didCancel: true, errorCode: 'permission', errorMessage: 'Camera permission denied' } as ImagePickerResponse);
        return;
      }
    } catch (err) {
      console.warn(err);
      callback({ didCancel: true, errorCode: 'others', errorMessage: String(err) } as ImagePickerResponse);
      return;
    }
  }
  originalLaunchCamera(options, callback);
};

export { launchImageLibrary };
