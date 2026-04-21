import React from 'react';

import { useAuth } from '../context/AuthContext';
import MainStack from './MainStack';

export default function MainTabs() {
  const { session } = useAuth();

  if (!session) {
    return null;
  }

  return <MainStack role={session.role} />;
}