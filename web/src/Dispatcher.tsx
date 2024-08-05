import { Suspense, lazy, useEffect, useState } from "react";
import { useErrorBoundary, withErrorBoundary } from "react-error-boundary";
import { useMatch } from "react-router-dom";
import { useRecoilState } from "recoil";
import { AppConfig } from "./appconfig";
import MaintenenceImg from "./assets/images/maintenance.png";
import Alert from "./components/Alert/Alert";
import Loader from "./components/Loader/Loader";
// import App from "./App";
import { appContextAtom } from "./store/app.state";

const App = lazy(() => import("./App"));

const renderApp = (version: string) => {
  // return <App />;
  try {
    switch (typeof version) {
      case "string":
        return <App />;
      default:
        return (
          <Alert variant="danger">Version {version} is not supported</Alert>
        );
    }
  } catch (error) {
    return <Alert variant="danger">Failed to initialize</Alert>;
  }
};

const Preloader = (props: React.HTMLAttributes<HTMLDivElement>) => {
  const { children } = props;
  return (
    <div className="fixed w-screen h-screen left-0 top-0">
      <div className="flex items-center justify-center w-full h-full">
        {children}
      </div>
    </div>
  );
};

const Dispatcher = () => {
  const { showBoundary } = useErrorBoundary();
  const routeMatch = useMatch("/o/:daoname/*");
  const [{ version }, setAppContext] = useRecoilState(appContextAtom);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  useEffect(() => {
    const _initialize = async () => {
      try {
        AppConfig.setup();
        await AppConfig.goshclient.client.version();
        setIsInitialized(true);
      } catch (e: any) {
        console.error(e.message);
        showBoundary(e);
      }
    };

    _initialize();
  }, []);

  useEffect(() => {
    const _setAppContext = async () => {
      const versions = Object.keys(AppConfig.versions).reverse();

      // Search version for DAO
      let version: string | null = null;
      if (routeMatch?.params.daoname) {
        for (const ver of versions) {
          console.debug(routeMatch.params.daoname, ver);
          const sc = AppConfig.goshroot.getSystemContract(ver);
          const dc = await sc.getDao({ name: routeMatch.params.daoname });
          if (await dc.isDeployed()) {
            version = ver;
            break;
          }
        }
      }

      // Fallback to default latest version
      version = version || AppConfig.getLatestVersion();

      setAppContext((state) => ({
        ...state,
        version,
        daoname: routeMatch?.params.daoname,
      }));
    };

    if (isInitialized) {
      _setAppContext();
    }
  }, [isInitialized, routeMatch?.params.daoname]);

  if (!isInitialized) {
    return (
      <Preloader>
        <Loader>App is loading</Loader>
      </Preloader>
    );
  }
  if (!version) {
    return (
      <Preloader>
        <Loader>Search context</Loader>
      </Preloader>
    );
  }
  return (
    <Suspense
      fallback={
        <Preloader>
          <Loader>Render application</Loader>
        </Preloader>
      }
    >
      {AppConfig.maintenance === 1 && (
        <div className="container mt-3">
          <Alert variant="warning">
            <h1 className="font-medium">Sorry, we have temporary problems</h1>
            <div>Write operations don't work due to maintanance</div>
          </Alert>
        </div>
      )}

      {AppConfig.maintenance === 2 ? (
        <div className="fixed left-0 top-0 w-screen h-screen">
          <div className="mt-20 w-auto md:w-1/2 lg:w-1/3 mx-auto">
            <img src={MaintenenceImg} alt="Maintenance" className="w-full" />
          </div>
          <div className="mt-10 text-lg font-medium text-center">
            We are on a technical break, please check back later
          </div>
        </div>
      ) : (
        renderApp(version)
      )}
    </Suspense>
  );
};

export default withErrorBoundary(Dispatcher, {
  fallbackRender: ({ error }) => (
    <Alert variant="danger">{error.message}</Alert>
  ),
});
