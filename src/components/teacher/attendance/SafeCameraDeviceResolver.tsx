import React from 'react';
import { useCameraDevice } from 'react-native-vision-camera';
import { ErrorBoundary } from '../../ErrorBoundary';

const CameraDeviceResolver = React.memo(({
  position,
  onDevice,
}: {
  position: 'back' | 'front';
  onDevice: (d: any) => void;
}) => {
  const device = useCameraDevice(position);
  React.useEffect(() => { onDevice(device); }, [device, onDevice]);
  return null;
});

CameraDeviceResolver.displayName = 'CameraDeviceResolver';

const SafeCameraDeviceResolver = React.memo(({
  position,
  onDevice,
}: {
  position: 'back' | 'front';
  onDevice: (d: any) => void;
}) => (
  <ErrorBoundary fallback={null}>
    <CameraDeviceResolver position={position} onDevice={onDevice} />
  </ErrorBoundary>
));

SafeCameraDeviceResolver.displayName = 'SafeCameraDeviceResolver';

export default SafeCameraDeviceResolver;
