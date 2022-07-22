import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

function ScrollToTop() {
  
  const prevLocation = useRef('');
  const location = useLocation();

  useEffect(() => {
    if (prevLocation.current !== location.pathname) {
      window.scrollTo(0, 0);
    }
  });

  useEffect(() => {
    prevLocation.current = location.pathname;
  }, [location.pathname]);

  return (null);
}

export default ScrollToTop;