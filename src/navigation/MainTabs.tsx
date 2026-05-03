import React from 'react';

import { useAuth } from '../context/AuthContext';
import MainStack from './MainStack';

export default function MainTabs() {
  const { userRole } = useAuth();

  if (!userRole) {
    return null;
  }

  return <MainStack role={userRole as any} />;
}