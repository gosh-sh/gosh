import { useEffect } from 'react';
import { useNavigate, Routes, Route, useLocation } from 'react-router-dom';
import cn from 'classnames';
import { isMobile } from 'react-device-detect';

import Content from './content';
import { Header } from './../layouts';
import Containers from './../pages/Containers';

const Router = () => {
    const navigate = useNavigate();
    const location = useLocation();
    useEffect(() => {
        navigate('/');
        location.pathname = '/';
        return () => {};
    }, []);

    return (
        <div
            className={cn('ws-app', location.pathname.split('/').filter(Boolean)[0], {
                isMobile: isMobile,
                main: !location.pathname.split('/').filter(Boolean)[0],
            })}
        >
            <Header
                location={location.pathname.split('/').filter(Boolean)[0] || 'main'}
            />
            <main>
                <Routes>
                    {/* <Route path="/" element={<HomePage />} /> */}
                    {/* <Route path="/containers" element={<Containers />} /> */}
                    <Route path="/" element={<Containers />} />
                    <Route path="/legal-notes/:id" element={<Content />} />
                    <Route path="*" element={<p>No match (404)</p>} />
                </Routes>
            </main>
        </div>
    );
};

export default Router;
