import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import { AppConfig } from 'react-gosh'

import Header from './components/Header'
import ProtectedLayout from './pages/ProtectedLayout'
import AccountLayout from './pages/AccountLayout'
import DaoLayout from './pages/DaoLayout'
import DaoSettingsLayout from './pages/DaoSettingsLayout'
import RepoLayout from './pages/RepoLayout'
import SettingsPage from './pages/Settings'
import SignupPage from './pages/Signup'
import SigninPage from './pages/Signin'
import DaosPage from './pages/Daos'
import DaoPage from './pages/Dao'
import DaoCreatePage from './pages/DaoCreate/DaoCreate'
import DaoUpgradePage from './pages/DaoUpgrade'
import DaoWalletPage from './pages/DaoWallet'
import DaoMembersPage from './pages/DaoMembers'
import DaoReposPage from './pages/DaoRepos'
import RepoCreatePage from './pages/RepoCreate'
import ReposPage from './pages/Repos'
import RepoPage from './pages/Repo'
import RepoUpgradePage from './pages/RepoUpgrade'
import BranchesPage from './pages/Branches'
import BlobCreatePage from './pages/BlobCreate'
import BlobUpdatePage from './pages/BlobUpdate'
import BlobDeletePage from './pages/BlobDelete'
import BlobPage from './pages/Blob'
import CommitsPage from './pages/Commits'
import CommitPage from './pages/Commit'
import MergeCreatePage from './pages/MergeCreate'
import GotoPage from './pages/Goto'
import EventsPage from './pages/Events'
import EventPage from './pages/Event'
import NotFoundPage from './pages/404'
import OnboardingPage from './pages/Onboarding'
import OnboardingStatusPage from './pages/OnboardingStatus'

import './assets/scss/style.scss'
import BaseModal from './components/Modal/BaseModal'
import Spinner from './components/Spinner'
import { ToastOptionsShortcuts } from './helpers'
import Containers from './docker-extension/pages/Containers'
import BuildPage from './docker-extension/pages/Build'
import { NetworkQueriesProtocol } from '@eversdk/core'
import DaoSetupPage from './pages/DaoSetup/DaoSetup'
import TaskCreatePage from './pages/TaskCreate'
import TasksPage from './pages/Tasks'

const App = () => {
    const [isInitialized, setIsInitialized] = useState<boolean>(false)

    const getAppConfig = () => {
        const endpoints = process.env.REACT_APP_GOSH_NETWORK?.split(',')
        const versions = JSON.parse(process.env.REACT_APP_GOSH || '{}')
        return {
            goshclient: {
                network: {
                    endpoints,
                    queries_protocol:
                        process.env.REACT_APP_ISDOCKEREXT === 'true'
                            ? NetworkQueriesProtocol.HTTP
                            : NetworkQueriesProtocol.WS,
                    sending_endpoint_count: endpoints?.length,
                },
            },
            goshroot: process.env.REACT_APP_GOSH_ROOTADDR || '',
            goshver: versions,
            ipfs: process.env.REACT_APP_IPFS || '',
            isDockerExt: process.env.REACT_APP_ISDOCKEREXT === 'true',
        }
    }

    const initializeApp = async (config: any) => {
        AppConfig.setup(config)
        await AppConfig.goshclient.client.version()
        setIsInitialized(true)
    }

    useEffect(() => {
        // Make all app initializations
        const appconfig = getAppConfig()
        initializeApp(appconfig)

        // Register service functions for testing/debugging
        // @ts-ignore
        window._setGoshVersionLimit = function (num: number) {
            if (num < 1) {
                console.log('Number should be >= 1')
                return false
            }

            const sliced: any = {}
            Object.keys(appconfig.goshver)
                .slice(0, num)
                .forEach((ver) => (sliced[ver] = appconfig.goshver[ver]))
            AppConfig.setup({ ...appconfig, goshver: sliced })
            return AppConfig.versions
        }
    }, [])

    useEffect(() => {
        const _restartTimer = () => {
            if (timer) clearInterval(timer)
            timer = setInterval(async () => {
                await AppConfig.goshclient.net.suspend()
                console.debug('Gosh client suspended')
                await AppConfig.goshclient.net.resume()
                console.debug('Gosh client resumed')
            }, 1000 * 60 * 10)
        }

        // Initialize gosh client suspend/resume timer
        let timer: NodeJS.Timeout | null = null
        _restartTimer()

        // Listen for mouse events
        window.addEventListener('mousemove', _restartTimer)

        return () => {
            if (timer) {
                clearTimeout(timer)
                window.removeEventListener('mousemove', _restartTimer)
            }
        }
    }, [])

    if (!isInitialized)
        return (
            <div className="w-screen h-screen flex items-center justify-center">
                <div>
                    <Spinner className="mr-3" size="lg" />
                    App is loading...
                </div>
            </div>
        )
    return (
        <div className="wrapper">
            <Header />
            <main id="main" className="grow">
                <Routes>
                    <Route
                        path="/"
                        element={
                            process.env.REACT_APP_ISDOCKEREXT === 'true' ? (
                                <SigninPage />
                            ) : (
                                <Navigate to="onboarding" replace />
                            )
                        }
                    />
                    <Route path="/containers" element={<ProtectedLayout />}>
                        <Route index element={<Containers />} />
                    </Route>
                    <Route path="/onboarding">
                        <Route index element={<OnboardingPage />} />
                        <Route path="status" element={<OnboardingStatusPage />} />
                    </Route>
                    <Route path="/a/signin" element={<SigninPage />} />
                    <Route path="/a/signup" element={<SignupPage />} />
                    <Route path="/a" element={<ProtectedLayout />}>
                        <Route path="orgs/create" element={<DaoCreatePage />} />
                        <Route element={<AccountLayout />}>
                            <Route index element={null} />
                            <Route path="orgs" element={<DaosPage />} />
                            <Route path="repos" element={<ReposPage />} />
                            <Route path="settings" element={<SettingsPage />} />
                        </Route>
                    </Route>
                    <Route
                        path="/o/:daoName"
                        element={<ProtectedLayout redirect={false} />}
                    >
                        <Route element={<DaoLayout />}>
                            <Route index element={<DaoPage />} />
                            <Route path="repos" element={<DaoReposPage />} />
                            <Route path="repos/create" element={<RepoCreatePage />} />
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
                            </Route>
                        </Route>
                        <Route path="r/:repoName" element={<RepoLayout />}>
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
                        </Route>
                    </Route>
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </main>
            <footer className="footer"></footer>

            <ToastContainer {...ToastOptionsShortcuts.Default} />
            <BaseModal />
        </div>
    )
}

export default App
