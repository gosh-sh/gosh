import { BrowserRouter, HashRouter } from "react-router-dom";
import "./../assets/styles/index.scss";
import Router from "./router";
import { HelmetProvider } from 'react-helmet-async';
import { DockerMuiThemeProvider } from '@docker/docker-mui-theme';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      // Purple and green play nicely together.
      main: '#4B95E6',
    },
    secondary: {
      // This is green.A700 as hex.
      main: '#11cb5f',
    },
  },
});

const App = () => {
  return (
    <ThemeProvider theme={theme}>
        <DockerMuiThemeProvider>
        <HelmetProvider>
          <HashRouter>
            <Router />
          </HashRouter>
        </HelmetProvider>
    </DockerMuiThemeProvider>
      </ThemeProvider>
  );
};



export default App;
