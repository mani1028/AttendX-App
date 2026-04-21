import React from 'react';

import { AppRole } from '../constants/roles';
import AccountantStack from './stacks/AccountantStack';
import AdminStack from './stacks/AdminStack';
import HMStack from './stacks/HMStack';
import PrincipalStack from './stacks/PrincipalStack';
import StudentStack from './stacks/StudentStack';
import TeacherStack from './stacks/TeacherStack';
import VisitorStack from './stacks/VisitorStack';

type Props = {
  role: AppRole;
};

export default function MainStack({ role }: Props) {
  switch (role) {
    case 'student':
      return <StudentStack />;
    case 'teacher':
      return <TeacherStack />;
    case 'hm':
      return <HMStack />;
    case 'principal':
      return <PrincipalStack />;
    case 'accountant':
      return <AccountantStack />;
    case 'admin':
      return <AdminStack />;
    case 'visitor':
      return <VisitorStack />;
    default:
      return <StudentStack />;
  }
}