import { ToastContainer } from 'react-toastify'
import Header from './components/Header'
import { ToastOptionsShortcuts } from '../helpers'
import BaseModal from '../components/Modal/BaseModal'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import AccountLayout from './pages/AccountLayout'
import DaoLayout from './pages/DaoLayout'
import NotFoundPage from '../pages/404'
import SigninPage from './pages/Signin'
import SignupPage from './pages/Signup'
import SettingsPage from './pages/Settings'
import DaoCreatePage from './pages/DaoCreate'
import OnboardingPage from './pages/Onboarding'
import OnboardingStatusPage from './pages/OnboardingStatus'
import UserDaoListPage from './pages/UserDaoList'
import DaoPage from './pages/Dao'
import DaoRepositoryListPage from './pages/DaoRepositoryList'
import DaoMemberListPage from './pages/DaoMemberList'
import DaoEventListPage from './pages/DaoEventList'
import Containers from '../docker-extension/pages/Containers'
import DaoSettingsLayout from './pages/DaoSettingsLayout'
import DaoUpgradePage from './pages/DaoUpgrade'
import DaoSetupPage from './pages/DaoSetup/DaoSetup'
import OnboardingDaoPage from './pages/OnboardingDao'
import DaoTaskListPage from './pages/DaoTaskList'
import TaskCreatePage from './pages/TaskCreate'

// TODO: Update after full refactor
import RepoLayout from '../pages/RepoLayout'
import RepoPage from '../pages/Repo'
import BranchesPage from '../pages/Branches'
import BlobCreatePage from '../pages/BlobCreate'
import BlobUpdatePage from '../pages/BlobUpdate'
import BlobDeletePage from '../pages/BlobDelete'
import BlobPage from '../pages/Blob'
import CommitsPage from '../pages/Commits'
import CommitPage from '../pages/Commit'
import MergeCreatePage from '../pages/MergeCreate'
import BuildPage from '../docker-extension/pages/Build'
import GotoPage from '../pages/Goto'
import { ToastStatus } from '../components/Toast'
// TODO: /Update after full refactor

const App = () => {
    return (
        <div className="wrapper">
            <Header />
            <main id="main" className="grow">
                <AnimatePresence mode="wait">
                    <Routes>
                        <Route path="/" element={<Navigate to="onboarding" replace />} />
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
                            <Route path="settings" element={<SettingsPage />} />
                        </Route>
                        <Route path="/o/:daoname" element={<DaoLayout />}>
                            <Route index element={<DaoPage />} />
                            <Route path="onboarding" element={<OnboardingDaoPage />} />
                            <Route path="repos" element={<DaoRepositoryListPage />} />
                            <Route
                                path="events/:address?"
                                element={<DaoEventListPage />}
                            />
                            <Route path="members" element={<DaoMemberListPage />} />
                            <Route path="tasks">
                                <Route index element={<DaoTaskListPage />} />
                                <Route path="create" element={<TaskCreatePage />} />
                                <Route
                                    path="milestone/:address"
                                    element={<DaoTaskListPage />}
                                />
                                <Route path=":address" element={<DaoTaskListPage />} />
                            </Route>
                            <Route path="settings" element={<DaoSettingsLayout />}>
                                <Route
                                    index
                                    element={<Navigate to="setup" replace={true} />}
                                />
                                <Route path="upgrade" element={<DaoUpgradePage />} />
                                <Route path="setup" element={<DaoSetupPage />} />
                            </Route>
                        </Route>
                        <Route path="/o/:daoName/r/:repoName" element={<RepoLayout />}>
                            <Route index element={<RepoPage />} />
                            <Route path="tree/:branchName/*" element={<RepoPage />} />
                            <Route path="branches" element={<BranchesPage />} />
                            <Route path="blobs">
                                <Route
                                    path="create/:branchName/*"
                                    element={<BlobCreatePage />}
                                />
                                <Route
                                    path="update/:branchName/*"
                                    element={<BlobUpdatePage />}
                                />
                                <Route
                                    path="delete/:branchName/*"
                                    element={<BlobDeletePage />}
                                />
                                <Route path="view/:branchName/*" element={<BlobPage />} />
                            </Route>
                            <Route path="commits">
                                <Route path=":branchName" element={<CommitsPage />} />
                                <Route
                                    path=":branchName/:commitName"
                                    element={<CommitPage />}
                                />
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

            <ToastContainer {...ToastOptionsShortcuts.Default} />
            <ToastStatus />
            <BaseModal />
        </div>
    )
}

export default App
