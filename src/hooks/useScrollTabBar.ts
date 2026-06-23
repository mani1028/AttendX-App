import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export function useScrollTabBar() {
  const { setTabBarVisible } = useAuth();
  const lastScrollY = useRef(0);

  useEffect(() => {
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, [setTabBarVisible]);

  const handleScroll = useCallback((event: any) => {
    const currentScrollY = event?.nativeEvent?.contentOffset?.y ?? 0;
    const deltaY = currentScrollY - lastScrollY.current;

    if (currentScrollY > 100 && deltaY > 10) {
      setTabBarVisible(false);
    } else if (deltaY < -10) {
      setTabBarVisible(true);
    }

    lastScrollY.current = currentScrollY;
  }, [setTabBarVisible]);

  return handleScroll;
}
