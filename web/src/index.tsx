import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import reportWebVitals from './reportWebVitals';
import { TonClient, BinaryLibrary } from '@eversdk/core';
import { libWeb } from '@eversdk/lib-web';
import App from './App';
import { RecoilRoot } from 'recoil';
import { QueryClient, QueryClientProvider } from 'react-query';

// Create React QueryClient
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
        },
    },
});

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
    <RecoilRoot>
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </QueryClientProvider>
    </RecoilRoot>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// eslint-disable-next-line react-hooks/rules-of-hooks
TonClient.useBinaryLibrary(() => {
    const promise = libWeb();
    return promise as unknown as Promise<BinaryLibrary>;
});
