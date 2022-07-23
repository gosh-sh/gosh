import React from 'react';
import App from './views/app';
import reportWebVitals from './reportWebVitals';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';

console.log('Version: 0.1.17');

const container = document.getElementById('root');
const root = createRoot(container!); // createRoot(container!) if you use TypeScript
root.render(
    <React.StrictMode>
        <HelmetProvider>
            <App />
        </HelmetProvider>
    </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
