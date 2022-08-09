import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import { goshClient } from 'gosh-react'

import Header from './components/Header'
import ProtectedLayout from './pages/ProtectedLayout'
import AccountLayout from './pages/AccountLayout'
import DaoLayout from './pages/DaoLayout'
import DaoSettingsLayout from './pages/DaoSettingsLayout'
import RepoLayout from './pages/RepoLayout'
import HomePage from './pages/Home'
import SettingsPage from './pages/Settings'
import SignupPage from './pages/Signup'
import SigninPage from './pages/Signin'
import DaosPage from './pages/Daos'
import DaoPage from './pages/Dao'
import DaoCreatePage from './pages/DaoCreate'
import DaoWalletPage from './pages/DaoWallet'
import DaoParticipantsPage from './pages/DaoParticipants'
import DaoReposPage from './pages/DaoRepos'
import RepoCreatePage from './pages/RepoCreate'
import ReposPage from './pages/Repos'
import RepoPage from './pages/Repo'
import BranchesPage from './pages/Branches'
import BlobCreatePage from './pages/BlobCreate'
import BlobUpdatePage from './pages/BlobUpdate'
import BlobPage from './pages/Blob'
import CommitsPage from './pages/Commits'
import CommitPage from './pages/Commit'
import PullCreatePage from './pages/PullCreate'
import GotoPage from './pages/Goto'
import EventsPage from './pages/Events'
import EventPage from './pages/Event'

import './assets/scss/style.scss'
import BaseModal from './components/Modal/BaseModal'
import Spinner from './components/Spinner'
import { ToastOptionsShortcuts } from './helpers'
import { shortString } from 'gosh-react'
import Containers from './docker-extension/pages/Containers'

const App = () => {
    const [isInitialized, setIsInitialized] = useState<boolean>(false)
    let timer: NodeJS.Timeout | null = null

    const timerRestart = () => {
        if (timer) clearInterval(timer)
        timer = setInterval(async () => {
            await goshClient.net.suspend()
            console.debug('Gosh client suspended')
            await goshClient.net.resume()
            console.debug('Gosh client resumed')
        }, 1000 * 60 * 10)
    }

    const onMouseMove = () => timerRestart()

    useEffect(() => {
        if (!goshClient) return
        goshClient.client.version().then(() => {
            setIsInitialized(true)
        })
    }, [])

    useEffect(() => {
        // Initialize gosh client suspend/resume timer
        timerRestart()

        // Listen for mouse events
        window.addEventListener('mousemove', onMouseMove)

        return () => {
            if (timer) {
                clearTimeout(timer)
                window.removeEventListener('mousemove', onMouseMove)
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
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/containers" element={<Containers />} />
                    <Route path="/account/signin" element={<SigninPage />} />
                    <Route path="/account/signup" element={<SignupPage />} />
                    <Route path="/account" element={<ProtectedLayout />}>
                        <Route path="orgs/create" element={<DaoCreatePage />} />
                        <Route element={<AccountLayout />}>
                            <Route index element={null} />
                            <Route path="orgs" element={<DaosPage />} />
                            <Route path="repos" element={<ReposPage />} />
                            <Route path="settings" element={<SettingsPage />} />
                        </Route>
                    </Route>
                    <Route
                        path="/:daoName"
                        element={<ProtectedLayout redirect={false} />}
                    >
                        <Route element={<DaoLayout />}>
                            <Route index element={<DaoPage />} />
                            <Route path="repos" element={<DaoReposPage />} />
                            <Route path="repos/create" element={<RepoCreatePage />} />
                            <Route path="events" element={<EventsPage />} />
                            <Route path="events/:eventAddr" element={<EventPage />} />
                            <Route path="settings" element={<DaoSettingsLayout />}>
                                <Route path="wallet" element={<DaoWalletPage />} />
                                <Route
                                    path="participants"
                                    element={<DaoParticipantsPage />}
                                />
                            </Route>
                        </Route>
                        <Route path=":repoName" element={<RepoLayout />}>
                            <Route index element={<RepoPage />} />
                            <Route path="tree/:branchName/*" element={<RepoPage />} />
                            <Route path="branches" element={<BranchesPage />} />
                            <Route
                                path="blobs/create/:branchName/*"
                                element={<BlobCreatePage />}
                            />
                            <Route
                                path="blobs/update/:branchName/*"
                                element={<BlobUpdatePage />}
                            />
                            <Route path="blobs/:branchName/*" element={<BlobPage />} />
                            <Route path="commits/:branchName" element={<CommitsPage />} />
                            <Route
                                path="commits/:branchName/:commitName"
                                element={<CommitPage />}
                            />
                            <Route path="pull" element={<PullCreatePage />} />
                            <Route path="find/:branchName" element={<GotoPage />} />
                        </Route>
                    </Route>
                    <Route path="*" element={<p>No match (404)</p>} />
                </Routes>
            </main>
            <footer className="footer">
                <div className="text-right text-xs text-gray-050a15">
                    {process.env.REACT_APP_GOSH_NETWORK}
                    <span className="mx-2">
                        {shortString(process.env.REACT_APP_GOSH_ADDR ?? '', 6, 4)}
                    </span>
                    {shortString(process.env.REACT_APP_CREATOR_ADDR ?? '', 6, 4)}
                </div>
            </footer>

            <ToastContainer {...ToastOptionsShortcuts.Default} />
            <BaseModal />
        </div>
    )
}

export default App
