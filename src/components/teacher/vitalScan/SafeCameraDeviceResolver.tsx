import React from 'react';
import { useCameraDevice } from 'react-native-vision-camera';
import { ErrorBoundary } from '../../ErrorBoundary';

const CameraDeviceResolver = React.memo(({ onDevice }: { onDevice: (d: any) => void }) => {
  const device = useCameraDevice('back');
  React.useEffect(() => { onDevice(device); }, [device, onDevice]);
  return null;
});

CameraDeviceResolver.displayName = 'CameraDeviceResolver';

const SafeCameraDeviceResolver = React.memo(({ onDevice }: { onDevice: (d: any) => void }) => (
  <ErrorBoundary fallback={null}>
    <CameraDeviceResolver onDevice={onDevice} />
  </ErrorBoundary>
));

SafeCameraDeviceResolver.displayName = 'SafeCameraDeviceResolver';

export default SafeCameraDeviceResolver;
