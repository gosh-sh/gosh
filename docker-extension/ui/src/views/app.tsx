import { BrowserRouter } from "react-router-dom";
import "./../assets/styles/index.scss";
import Router from "./router";
import { HelmetProvider } from 'react-helmet-async';
import { DockerMuiThemeProvider } from '@docker/docker-mui-theme';

const App = () => {
  return (
    <DockerMuiThemeProvider>
      <HelmetProvider>
        <BrowserRouter>
          <Router />
        </BrowserRouter>
      </HelmetProvider>
    </DockerMuiThemeProvider>
  );
};



export default App;
