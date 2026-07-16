import AdminPanelSettingsTwoToneIcon from '@mui/icons-material/AdminPanelSettingsTwoTone';
import AssignmentIndTwoToneIcon from '@mui/icons-material/AssignmentIndTwoTone';
import WorkTwoToneIcon from '@mui/icons-material/WorkTwoTone';

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
            name: 'Fullz Management',
            link: '/applications/citizen-management'
          },
          {
            name: 'LinkedIn Management',
            link: '/applications/linkedin-management'
          }
        ]
      }
    ]
  },
  {
    heading: 'Job Management',
    adminOnly: true,
    items: [
      {
        name: 'Job Management',
        icon: WorkTwoToneIcon,
        link: '/applications',
        items: [
          {
            name: 'Identity Management',
            link: '/applications/identity-management'
          },
          {
            name: 'Profile Management',
            link: '/applications/profile-management'
          },        
          {
            name: 'Skill Management',
            link: '/applications/skill-management'
          },
          {
            name: 'Job Posts Management',
            link: '/applications/post-management'
          },
          {
            name: 'Application Management',
            link: '/applications/application-management'
          },
          {
            name: 'Email Management',
            link: '/applications/email-management'
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
          // {
          //   name: 'Resume Builder',
          //   link: '/applications/resume-builder'
          // }
        ]
      }
    ]
  }
];

export default menuItems;
