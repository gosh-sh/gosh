import { ToastContainer } from 'react-toastify'
import Header from './components/Header'
import { ToastOptionsShortcuts } from '../helpers'
import BaseModal from '../components/Modal/BaseModal'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
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

const App = () => {
    const location = useLocation()

    return (
        <div className="wrapper">
            <Header />
            <main id="main" className="grow">
                <AnimatePresence>
                    <Routes location={location} key={location.pathname}>
                        <Route path="/" element={<Navigate to="onboarding" replace />} />
                        {/* <Route path="/containers" element={<ProtectedLayout />}>
                        <Route index element={<Containers />} />
                    </Route> */}
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
                        <Route path="/o/:daoName" element={<DaoLayout />}>
                            <Route index element={<DaoPage />} />
                            {/* <Route path="onboarding" element={<OnboardingDaoPage />} />
                            <Route path="repos" element={<DaoReposPage />} />
                            <Route path="repos/create" element={<RepoCreatePage />} />
                            <Route path="repos/upgrade" element={<ReposUpgradePage />} />
                            <Route path="events" element={<EventsPage />} />
                            <Route path="events/:eventAddr" element={<EventPage />} />
                            <Route path="members" element={<DaoMembersPage />} />
                            <Route path="wallet" element={<DaoWalletPage />} />
                            <Route path="settings" element={<DaoSettingsLayout />}>
                                <Route
                                    index
                                    element={<Navigate to="setup" replace={true} />}
                                />
                                <Route path="upgrade" element={<DaoUpgradePage />} />
                                <Route path="setup" element={<DaoSetupPage />} />
                            </Route>
                            <Route path="tasks">
                                <Route index element={<TasksPage />} />
                                <Route path="create" element={<TaskCreatePage />} />
                                <Route path="upgrade" element={<TasksUpgradePage />} />
                                <Route path=":address" element={<TaskPage />} />
                            </Route>
                            <Route path="topics">
                                <Route index element={<TopicsPage />} />
                                <Route path="create" element={<TopicCreatePage />} />
                                <Route path=":topic" element={<TopicPage />} />
                            </Route> */}

                            {/* <Route path="r/:repoName" element={<RepoLayout />}>
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
                            <Route path="upgrade" element={<RepoUpgradePage />} />
                        </Route> */}
                        </Route>
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </AnimatePresence>
            </main>
            <footer className="footer"></footer>

            <ToastContainer {...ToastOptionsShortcuts.Default} />
            <BaseModal />
        </div>
    )
}

export default App
