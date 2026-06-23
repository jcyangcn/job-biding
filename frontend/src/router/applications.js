import { Suspense, lazy } from 'react';
import { Navigate } from 'react-router-dom';

import RequireAdmin from 'src/components/RequireAdmin';
import SuspenseLoader from 'src/components/SuspenseLoader';

const Loader = (Component) => (props) =>
  (
    <Suspense fallback={<SuspenseLoader />}>
      <Component {...props} />
    </Suspense>
  );

// Applications

const FileManager = Loader(
  lazy(() => import('src/content/applications/FileManager'))
);
const Messenger = Loader(
  lazy(() => import('src/content/applications/Messenger'))
);
const Calendar = Loader(
  lazy(() => import('src/content/applications/Calendar'))
);
const JobsPlatform = Loader(
  lazy(() => import('src/content/applications/JobsPlatform'))
);
const ProjectsBoard = Loader(
  lazy(() => import('src/content/applications/ProjectsBoard'))
);
const Mailbox = Loader(lazy(() => import('src/content/applications/Mailbox')));
const ResumeBuilder = Loader(
  lazy(() => import('src/content/applications/ResumeBuilder'))
);
const ResumeHistory = Loader(
  lazy(() => import('src/content/applications/ResumeHistory'))
);
const UserManagement = Loader(
  lazy(() => import('src/content/applications/UserManagement'))
);
const IdentityManagement = Loader(
  lazy(() => import('src/content/applications/IdentityManagement'))
);
const ProfileManagement = Loader(
  lazy(() => import('src/content/applications/ProfileManagement'))
);
const ApplicationManagement = Loader(
  lazy(() => import('src/content/applications/ApplicationManagement'))
);
const EmailManagement = Loader(
  lazy(() => import('src/content/applications/EmailManagement'))
);
const Applications = Loader(
  lazy(() => import('src/content/applications/Applications'))
);
const ApplicationList = Loader(
  lazy(() => import('src/content/applications/Applications/ApplicationList'))
);
const ApplicationDetails = Loader(
  lazy(() => import('src/content/applications/Applications/ApplicationDetails'))
);
const ProgressionEmails = Loader(
  lazy(() => import('src/content/applications/ProgressionEmails'))
);
const ProgressionEmailList = Loader(
  lazy(() => import('src/content/applications/ProgressionEmails/ProgressionEmailList'))
);
const ProgressionEmailCreate = Loader(
  lazy(() => import('src/content/applications/ProgressionEmails/ProgressionEmailCreate'))
);

const applicationsRoutes = [
  {
    path: '',
    element: <Navigate to="resume-builder" replace />
  },
  {
    path: 'resume-builder',
    element: <ResumeBuilder />
  },
  {
    path: 'job-applications',
    element: <Applications />
  },
  {
    path: 'job-applications/:profileId/new',
    element: <ApplicationDetails />
  },
  {
    path: 'job-applications/:profileId',
    element: <ApplicationList />
  },
  {
    path: 'progression-emails',
    element: <ProgressionEmails />
  },
  {
    path: 'progression-emails/:profileId/new',
    element: <ProgressionEmailCreate />
  },
  {
    path: 'progression-emails/:profileId',
    element: <ProgressionEmailList />
  },
  {
    path: 'resume-history',
    element: <ResumeHistory />
  },
  {
    path: 'user-management',
    element: (
      <RequireAdmin>
        <UserManagement />
      </RequireAdmin>
    )
  },
  {
    path: 'identity-management',
    element: (
      <RequireAdmin>
        <IdentityManagement />
      </RequireAdmin>
    )
  },
  {
    path: 'profile-management',
    element: (
      <RequireAdmin>
        <ProfileManagement />
      </RequireAdmin>
    )
  },
  {
    path: 'application-management',
    element: (
      <RequireAdmin>
        <ApplicationManagement />
      </RequireAdmin>
    )
  },
  {
    path: 'email-management',
    element: (
      <RequireAdmin>
        <EmailManagement />
      </RequireAdmin>
    )
  },
  {
    path: 'calendar',
    element: <Calendar />
  },
  {
    path: 'file-manager',
    element: <FileManager />
  },
  {
    path: 'jobs-platform',
    element: <JobsPlatform />
  },
  {
    path: 'projects-board',
    element: <ProjectsBoard />
  },
  {
    path: 'messenger',
    element: <Messenger />
  },
  {
    path: 'mailbox',
    children: [
      {
        path: '',
        element: <Navigate to="inbox" replace />
      },
      {
        path: 'tag/:labelTag',
        element: <Mailbox />
      },
      {
        path: 'tag/:labelTag/:mailboxCategory',
        element: <Mailbox />
      },
      {
        path: ':categoryTag',
        element: <Mailbox />
      },
      {
        path: ':categoryTag/:mailboxCategory',
        element: <Mailbox />
      }
    ]
  }
];

export default applicationsRoutes;
