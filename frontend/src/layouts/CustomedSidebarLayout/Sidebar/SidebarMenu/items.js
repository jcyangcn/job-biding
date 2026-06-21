import AdminPanelSettingsTwoToneIcon from '@mui/icons-material/AdminPanelSettingsTwoTone';
import AssignmentIndTwoToneIcon from '@mui/icons-material/AssignmentIndTwoTone';

const menuItems = [
  {
    heading: 'Management',
    adminOnly: true,
    items: [
      {
        name: 'Management',
        icon: AdminPanelSettingsTwoToneIcon,
        link: '/applications',
        items: [
          {
            name: 'User Management',
            link: '/applications/user-management'
          },
          {
            name: 'Identity Management',
            link: '/applications/identity-management'
          },
          {
            name: 'Profile Management',
            link: '/applications/profile-management'
          }
        ]
      }
    ]
  },
  {
    heading: 'Job application',
    items: [
      {
        name: 'Job application',
        icon: AssignmentIndTwoToneIcon,
        link: '/applications/job-applications',
        items: [
          {
            name: 'Applications',
            link: '/applications/job-applications'
          },
          {
            name: 'Progression Emails',
            link: '/applications/progression-emails'
          },
          {
            name: 'Resume Builder',
            link: '/applications/resume-builder'
          }
        ]
      }
    ]
  }
];

export default menuItems;
