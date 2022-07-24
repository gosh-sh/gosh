import React from 'react';
import App from './views/app';
import reportWebVitals from './reportWebVitals';
import { render } from 'react-dom'; // React 17
// import { createRoot } from 'react-dom/client'; // React 18

console.log('Version: 0.1.17');

/** React 17 */
const container = document.getElementById('root');
render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
    container
);

/** React 18 */
// const container = document.getElementById('root');
// const root = createRoot(container!); // createRoot(container!) if you use TypeScript
// root.render(
//     <React.StrictMode>
//         <App />
//     </React.StrictMode>
// );

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
