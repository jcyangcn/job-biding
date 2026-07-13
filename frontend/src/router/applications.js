import { Suspense, lazy } from 'react';
import { Navigate, useParams } from 'react-router-dom';

import RequireAdmin from 'src/components/RequireAdmin';
import SuspenseLoader from 'src/components/SuspenseLoader';

const Loader = (Component) => (props) =>
  (
    <Suspense fallback={<SuspenseLoader />}>
      <Component {...props} />
    </Suspense>
  );

const ApplicationCreateRedirect = () => {
  const { profileId } = useParams();
  return <Navigate to={`/applications/job-applications/${profileId}`} replace />;
};

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
const CitizenManagement = Loader(
  lazy(() => import('src/content/applications/CitizenManagement'))
);
const LinkedInManagement = Loader(
  lazy(() => import('src/content/applications/LinkedInManagement'))
);
const SkillManagement = Loader(
  lazy(() => import('src/content/applications/SkillManagement'))
);
const CompanyManagement = Loader(
  lazy(() => import('src/content/applications/CompanyManagement'))
);
const Applications = Loader(
  lazy(() => import('src/content/applications/Applications'))
);
const ApplicationList = Loader(
  lazy(() => import('src/content/applications/Applications/ApplicationList'))
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
    element: <ApplicationCreateRedirect />
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
    path: 'citizen-management',
    element: (
      <RequireAdmin>
        <CitizenManagement />
      </RequireAdmin>
    )
  },
  {
    path: 'linkedin-management',
    element: (
      <RequireAdmin>
        <LinkedInManagement />
      </RequireAdmin>
    )
  },
  {
    path: 'skill-management',
    element: (
      <RequireAdmin>
        <SkillManagement />
      </RequireAdmin>
    )
  },
  {
    path: 'company-management',
    element: (
      <RequireAdmin>
        <CompanyManagement />
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
