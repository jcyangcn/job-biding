import DashboardTwoToneIcon from '@mui/icons-material/DashboardTwoTone';
import DescriptionTwoToneIcon from '@mui/icons-material/DescriptionTwoTone';
import HistoryTwoToneIcon from '@mui/icons-material/HistoryTwoTone';
import PeopleTwoToneIcon from '@mui/icons-material/PeopleTwoTone';
import { PROJECT_NAME } from 'src/config/app';

const menuItems = [
  {
    heading: PROJECT_NAME,
    items: [
      {
        name: 'Dashboard',
        icon: DashboardTwoToneIcon,
        link: '/dashboards'
      },
      {
        name: 'Resume Builder',
        icon: DescriptionTwoToneIcon,
        link: '/applications/resume-builder'
      },
      {
        name: 'Generation History',
        icon: HistoryTwoToneIcon,
        link: '/applications/resume-history'
      },
      {
        name: 'User Management',
        icon: PeopleTwoToneIcon,
        link: '/applications/user-management'
      }
    ]
  }
];

export default menuItems;
