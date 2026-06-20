import Authenticated from 'src/components/Authenticated';
import { Navigate } from 'react-router-dom';

import CustomedSidebarLayout from 'src/layouts/CustomedSidebarLayout';

import dashboardsRoutes from './dashboards';
import blocksRoutes from './blocks';
import applicationsRoutes from './applications';
import managementRoutes from './management';
import accountRoutes from './account';

const router = [
  {
    path: 'account',
    children: accountRoutes
  },
  {
    path: '/',
    element: (
      <Authenticated>
        <CustomedSidebarLayout />
      </Authenticated>
    ),
    children: [
      {
        path: '',
        element: <Navigate to="dashboards" replace />
      },
      {
        path: 'dashboards',
        children: dashboardsRoutes
      },
      {
        path: 'blocks',
        children: blocksRoutes
      },
      {
        path: 'applications',
        children: applicationsRoutes
      },
      {
        path: 'management',
        children: managementRoutes
      },
      {
        path: '*',
        element: <Navigate to="dashboards" replace />
      }
    ]
  }
];

export default router;
