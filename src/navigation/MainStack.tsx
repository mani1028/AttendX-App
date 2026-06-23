import React from 'react';

import { AppRole } from '../constants/roles';
import AccountantStack from './AccountantStack';
import AdminStack from './AdminStack';
import DirectorStack from './DirectorStack';
import PrincipalStack from './PrincipalStack';
import StudentStack from './StudentStack';
import TeacherStack from './TeacherStack';
import VisitorStack from './VisitorStack';

type Props = {
  role: AppRole;
};

export default function MainStack({ role }: Props) {
  switch (role) {
    case 'student':
      return <StudentStack />;
    case 'teacher':
      return <TeacherStack />;
    case 'principal':
      return <PrincipalStack />;
    case 'director':
      return <DirectorStack />;
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
