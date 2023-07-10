import { Suspense, lazy, useEffect, useState } from 'react'
import { useMatch } from 'react-router-dom'
import { withErrorBoundary, useErrorBoundary } from 'react-error-boundary'
import Loader from './components/Loader/Loader'
import Alert from './components/Alert/Alert'
import { useRecoilState } from 'recoil'
import { appContextAtom } from './store/app.state'
import { AppConfig } from './appconfig'

const App_v1 = lazy(() => import('./v1/App'))
const App_v2 = lazy(() => import('./v2/App'))

const renderApp = (version: string) => {
    switch (version) {
        case '1.0.0':
            return <App_v1 />
        case '2.0.0':
            return <App_v2 />
        case '3.0.0':
            return <App_v2 />
        case '4.0.0':
            return <App_v2 />
        default:
            return <Alert variant="danger">Version {version} is not supported</Alert>
    }
}

const Preloader = (props: React.HTMLAttributes<HTMLDivElement>) => {
    const { children } = props
    return (
        <div className="fixed w-screen h-screen left-0 top-0">
            <div className="flex items-center justify-center w-full h-full">
                {children}
            </div>
        </div>
    )
}

const Dispatcher = () => {
    const { showBoundary } = useErrorBoundary()
    const routeMatch = useMatch('/o/:daoName/*')
    const [{ version }, setAppContext] = useRecoilState(appContextAtom)
    const [isInitialized, setIsInitialized] = useState<boolean>(false)

    useEffect(() => {
        const _initialize = async () => {
            try {
                AppConfig.setup()
                await AppConfig.goshclient.client.version()
                setIsInitialized(true)
            } catch (e: any) {
                console.error(e.message)
                showBoundary(e)
            }
        }

        _initialize()
    }, [])

    useEffect(() => {
        const _setAppContext = async () => {
            const versions = Object.keys(AppConfig.versions).reverse()

            let version = versions[0]
            if (routeMatch?.params.daoName) {
                for (const ver of versions) {
                    console.debug(routeMatch.params.daoName, ver)
                    const sc = AppConfig.goshroot.getSystemContract(ver)
                    const dc = await sc.getDao({ name: routeMatch.params.daoName })
                    if (await dc.isDeployed()) {
                        version = ver
                        break
                    }
                }
            }
            console.debug('setAppContext', version)

            setAppContext((state) => ({ ...state, version }))
        }

        if (isInitialized) {
            _setAppContext()
        }
    }, [isInitialized, routeMatch?.params.daoName])

    if (!isInitialized) {
        return (
            <Preloader>
                <Loader>App is loading</Loader>
            </Preloader>
        )
    }
    if (!version) {
        return (
            <Preloader>
                <Loader>Search context</Loader>
            </Preloader>
        )
    }
    return (
        <Suspense
            fallback={
                <Preloader>
                    <Loader>Render version context</Loader>
                </Preloader>
            }
        >
            {renderApp(version)}
        </Suspense>
    )
}

export default withErrorBoundary(Dispatcher, {
    fallbackRender: ({ error }) => <Alert variant="danger">{error.message}</Alert>,
})