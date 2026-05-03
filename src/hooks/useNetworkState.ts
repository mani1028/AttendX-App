import { useEffect, useState, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
}

export const useNetworkState = () => {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: true,
    isInternetReachable: true,
    type: 'unknown',
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setNetworkState({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? false,
        type: state.type || 'unknown',
      });
    });

    return () => unsubscribe();
  }, []);

  return networkState;
};

// Global network state singleton
let globalNetworkState: NetworkState = {
  isConnected: true,
  isInternetReachable: true,
  type: 'unknown',
};

export const initializeNetworkListener = () => {
  NetInfo.addEventListener((state) => {
    globalNetworkState = {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? false,
      type: state.type || 'unknown',
    };
    console.log('[Network] State changed:', globalNetworkState);
  });
};

export const getNetworkState = (): NetworkState => globalNetworkState;

export const isOnline = (): boolean => {
  return globalNetworkState.isConnected && globalNetworkState.isInternetReachable;
};
