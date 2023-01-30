import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import ReactTooltip from 'react-tooltip'
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
import DaoCreatePage from './pages/DaoCreate'
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
import PullCreatePage from './pages/PullCreate'
import MergeCreatePage from './pages/MergeCreate'
import GotoPage from './pages/Goto'
import EventsPage from './pages/Events'
import EventPage from './pages/Event'
import NotFoundPage from './pages/404'
import OnboardingPage from './pages/Onboarding'

import './assets/scss/style.scss'
import BaseModal from './components/Modal/BaseModal'
import Spinner from './components/Spinner'
import { onExternalLinkClick, ToastOptionsShortcuts } from './helpers'
import { shortString } from 'react-gosh'
import Containers from './docker-extension/pages/Containers'
import BuildPage from './docker-extension/pages/Build'
import CopyClipboard from './components/CopyClipboard'
import { NetworkQueriesProtocol } from '@eversdk/core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'

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
            <main className="main grow">
                <div className="container">
                    <div className="flex flex-nowrap items-start border border-yellow-500 rounded-lg mt-6 p-5 bg-yellow-50 gap-x-3">
                        <div className="text-yellow-500">
                            <FontAwesomeIcon icon={faExclamationTriangle} size="lg" />
                        </div>
                        <div>
                            Due to high load, some services may be temporarily
                            unavailable.
                            <br />
                            You can check status updates on{' '}
                            <a
                                href="https://twitter.com/gosh_shell"
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold"
                                onClick={(e) => {
                                    onExternalLinkClick(
                                        e,
                                        'https://twitter.com/gosh_shell',
                                    )
                                }}
                            >
                                Twitter
                            </a>
                            <br />
                            We apologize for any inconvenience.
                        </div>
                    </div>
                </div>

                <Routes>
                    <Route
                        path="/"
                        element={
                            process.env.REACT_APP_ISDOCKEREXT === 'true' ? (
                                <SigninPage />
                            ) : (
                                <SignupPage />
                            )
                        }
                    />
                    <Route path="/containers" element={<ProtectedLayout />}>
                        <Route index element={<Containers />} />
                    </Route>
                    <Route path="/onboarding" element={<OnboardingPage />} />
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
                            <Route path="settings" element={<DaoSettingsLayout />}>
                                <Route
                                    index
                                    element={<Navigate to="wallet" replace={true} />}
                                />
                                <Route path="wallet" element={<DaoWalletPage />} />
                                <Route path="members" element={<DaoMembersPage />} />
                                <Route path="upgrade" element={<DaoUpgradePage />} />
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
                            <Route path="pull" element={<PullCreatePage />} />
                            <Route path="merge" element={<MergeCreatePage />} />
                            <Route path="build/:branchName" element={<BuildPage />} />
                            <Route path="find/:branchName" element={<GotoPage />} />
                            <Route path="upgrade" element={<RepoUpgradePage />} />
                        </Route>
                    </Route>
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </main>
            <footer className="footer">
                <div className="flex flex-wrap gap-x-3 gap-y-1 justify-end text-xs text-gray-050a15 px-3 py-2">
                    {process.env.REACT_APP_GOSH_NETWORK?.split(',')[0]}
                    <CopyClipboard
                        label={
                            <span data-tip={process.env.REACT_APP_GOSH_ROOTADDR}>
                                {shortString(
                                    process.env.REACT_APP_GOSH_ROOTADDR ?? '',
                                    6,
                                    4,
                                )}
                            </span>
                        }
                        componentProps={{
                            text: process.env.REACT_APP_GOSH_ROOTADDR ?? '',
                        }}
                    />
                </div>
            </footer>

            <ToastContainer {...ToastOptionsShortcuts.Default} />
            <ReactTooltip clickable />
            <BaseModal />
        </div>
    )
}

export default App
