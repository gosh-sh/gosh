import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import reportWebVitals from './reportWebVitals'
import { TonClient, BinaryLibrary } from '@eversdk/core'
import { libWeb, libWebSetup } from '@eversdk/lib-web'
import App from './App'
import { RecoilRoot } from 'recoil'

// Check for docker extension flag
let ConditionedRouter = BrowserRouter
if (import.meta.env.REACT_APP_ISDOCKEREXT === 'true') {
    ConditionedRouter = HashRouter
    libWebSetup({
        binaryURL: `./eversdk.wasm?v=${Math.random().toString(36).slice(2, 8)}`,
    })
} else {
    libWebSetup({
        binaryURL: `/eversdk.wasm?v=8aiwbx`,
    })
}

const container = document.getElementById('root')
const root = createRoot(container!)
root.render(
    <RecoilRoot>
        <ConditionedRouter>
            <App />
        </ConditionedRouter>
    </RecoilRoot>,
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()

// eslint-disable-next-line react-hooks/rules-of-hooks
TonClient.useBinaryLibrary(() => {
    const promise = libWeb()
    return promise as unknown as Promise<BinaryLibrary>
})
