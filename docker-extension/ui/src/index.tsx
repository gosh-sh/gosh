import React from 'react';
import ReactDOM from 'react-dom';
import App from './views/app';
import { RecoilRoot } from 'recoil';
import reportWebVitals from './reportWebVitals';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { TonClient, BinaryLibrary } from '@eversdk/core';
import { libWeb, libWebSetup } from '@eversdk/lib-web';
import { QueryClient, QueryClientProvider } from 'react-query';

libWebSetup({ binaryURL: 'https://buy.ton.surf/eversdk.wasm' });

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
        refetchOnWindowFocus: false
    }
  }
});

const container = document.getElementById('root');
const root = createRoot(container!); // createRoot(container!) if you use TypeScript
root.render(
  <React.StrictMode>
    <RecoilRoot>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </HelmetProvider>
    </RecoilRoot>
</React.StrictMode>
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


