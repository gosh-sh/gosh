import { AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import BaseModal from '../components/Modal/BaseModal'
import { ToastStatus } from '../components/Toast'
import Containers from '../docker-extension/pages/Containers'
import { ToastOptionsShortcuts } from '../helpers'
import NotFoundPage from '../pages/404'
import HomePage from '../pages/Home'
import Header from './components/Header'
import {
  useUserNotificationList,
  useUserNotificationSettings,
} from './hooks/notification.hooks'
import AccountDetailsPage from './pages/AccountDetails'
import AccountGitRemotePage from './pages/AccountGitRemote'
import AccountLayout from './pages/AccountLayout'
import AccountNotificationsPage from './pages/AccountNotifications'
import AccountSecurityPage from './pages/AccountSecurity'
import AccountSettingsLayout from './pages/AccountSettingsLayout'
import DaoPage from './pages/Dao'
import DaoCreatePage from './pages/DaoCreate'
import DaoEventListPage from './pages/DaoEventList'
import DaoHackathonListPage from './pages/DaoHackathonList'
import DaoLayout from './pages/DaoLayout'
import DaoMemberListPage from './pages/DaoMemberList'
import DaoNotificationsPage from './pages/DaoNotifications'
import DaoRepositoryListPage from './pages/DaoRepositoryList'
import DaoSettingsLayout from './pages/DaoSettingsLayout'
import DaoSetupPage from './pages/DaoSetup'
import DaoTaskListPage from './pages/DaoTaskList'
import DaoTokenL2Page from './pages/DaoTokenL2'
import DaoUpgradePage from './pages/DaoUpgrade'
import HackathonCreatePage from './pages/HackathonCreate'
import HackathonLayout from './pages/HackathonLayout'
import HackathonOverviewPage from './pages/HackathonOverview'
import HackathonParticipantListPage from './pages/HackathonParticipantList'
import HackathonRewardPage from './pages/HackathonReward'
import L2Page from './pages/L2'
import OnboardingPage from './pages/Onboarding'
import OnboardingDaoPage from './pages/OnboardingDao'
import OnboardingStatusPage from './pages/OnboardingStatus'
import SigninPage from './pages/Signin'
import SignupPage from './pages/Signup'
import TaskCreatePage from './pages/TaskCreate'
import UserDaoListPage from './pages/UserDaoList'

// TODO: Update after full refactor
import BuildPage from '../docker-extension/pages/Build'
import BlobPage from '../pages/Blob'
import BlobCreatePage from '../pages/BlobCreate'
import BlobDeletePage from '../pages/BlobDelete'
import BlobUpdatePage from '../pages/BlobUpdate'
import BranchesPage from '../pages/Branches'
import CommitPage from '../pages/Commit'
import CommitsPage from '../pages/Commits'
import GotoPage from '../pages/Goto'
import MergeCreatePage from '../pages/MergeCreate'
import RepoPage from '../pages/Repo'
import RepoLayout from '../pages/RepoLayout'
// TODO: /Update after full refactor

const App = () => {
  useUserNotificationSettings({ initialize: true })
  useUserNotificationList({ initialize: true })

  return (
    <div className="wrapper">
      <Header />
      <main id="main" className="grow">
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/containers" element={<Containers />} />
            <Route path="/onboarding">
              <Route index element={<OnboardingPage />} />
              <Route path="status" element={<OnboardingStatusPage />} />
            </Route>
            <Route path="/a/signin" element={<SigninPage />} />
            <Route path="/a/signup" element={<SignupPage />} />
            <Route path="/a" element={<AccountLayout />}>
              <Route index element={null} />
              <Route path="orgs/create" element={<DaoCreatePage />} />
              <Route path="orgs" element={<UserDaoListPage />} />
              <Route path="l2" element={<L2Page />} />
              <Route path="settings" element={<AccountSettingsLayout />}>
                <Route index element={<Navigate to="details" replace={true} />} />
                <Route path="details" element={<AccountDetailsPage />} />
                <Route path="security" element={<AccountSecurityPage />} />
                <Route path="git-remote" element={<AccountGitRemotePage />} />
                <Route path="notifications" element={<AccountNotificationsPage />} />
              </Route>
            </Route>
            <Route path="/o/:daoname" element={<DaoLayout />}>
              <Route index element={<DaoPage />} />
              <Route path="onboarding" element={<OnboardingDaoPage />} />
              <Route path="repos" element={<DaoRepositoryListPage />} />
              <Route path="events/:address?" element={<DaoEventListPage />} />
              <Route path="members" element={<DaoMemberListPage />} />
              <Route path="tasks">
                <Route index element={<DaoTaskListPage />} />
                <Route path="create" element={<TaskCreatePage />} />
                <Route path="milestone/:address" element={<DaoTaskListPage />} />
                <Route path=":address" element={<DaoTaskListPage />} />
              </Route>
              <Route path="settings" element={<DaoSettingsLayout />}>
                <Route index element={<Navigate to="setup" replace={true} />} />
                <Route path="upgrade" element={<DaoUpgradePage />} />
                <Route path="setup" element={<DaoSetupPage />} />
                <Route path="notifications" element={<DaoNotificationsPage />} />
              </Route>
              <Route path="l2" element={<DaoTokenL2Page />} />
              <Route path="hacksgrants" element={<DaoHackathonListPage />} />
            </Route>
            <Route
              path="/o/:daoname/hacksgrants/create"
              element={<HackathonCreatePage />}
            />
            <Route path="/o/:daoname/hacksgrants/:reponame" element={<HackathonLayout />}>
              <Route index element={<HackathonOverviewPage />} />
              <Route path="rewards" element={<HackathonRewardPage />} />
              <Route path="participants" element={<HackathonParticipantListPage />} />
            </Route>
            <Route path="/o/:daoName/r/:repoName" element={<RepoLayout />}>
              <Route index element={<RepoPage />} />
              <Route path="tree/:branchName/*" element={<RepoPage />} />
              <Route path="branches" element={<BranchesPage />} />
              <Route path="blobs">
                <Route path="create/:branchName/*" element={<BlobCreatePage />} />
                <Route path="update/:branchName/*" element={<BlobUpdatePage />} />
                <Route path="delete/:branchName/*" element={<BlobDeletePage />} />
                <Route path="view/:branchName/*" element={<BlobPage />} />
              </Route>
              <Route path="commits">
                <Route path=":branchName" element={<CommitsPage />} />
                <Route path=":branchName/:commitName" element={<CommitPage />} />
              </Route>
              <Route path="merge" element={<MergeCreatePage />} />
              <Route path="build/:branchName" element={<BuildPage />} />
              <Route path="find/:branchName" element={<GotoPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AnimatePresence>
      </main>
      <footer className="footer"></footer>

      {createPortal(<ToastContainer {...ToastOptionsShortcuts.Default} />, document.body)}
      <ToastStatus />
      <BaseModal />
    </div>
  )
}

export default App
