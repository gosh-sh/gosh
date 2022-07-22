import { useEffect, useState } from "react";
import { useNavigate, Routes, Route, useLocation, Location } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import cn from "classnames";
import {
  isMobile
} from "react-device-detect";

import Main from "./main";
import Content from "./content";
import { Header, Footer } from "./../layouts";


import { useEverClient } from "./../hooks/ever.hooks";

import ProtectedLayout from "./../pages/ProtectedLayout";
import { Account } from "./../pages";
import Containers from "./../pages/Containers";
import DaoLayout from "./../pages/DaoLayout";
import RepoLayout from "./../pages/RepoLayout";
import HomePage from "./../pages/Home";
import DaosPage from "./../pages/Daos";
import DaoPage from "./../pages/Dao";
import DaoCreatePage from "./../pages/DaoCreate";
import ReposPage from "./../pages/Repos";
import RepoCreatePage from "./../pages/RepoCreate";
import RepoPage from "./../pages/Repo";
import BranchesPage from "./../pages/Branches";
import BlobCreatePage from "./../pages/BlobCreate";
import BlobUpdatePage from "./../pages/BlobUpdate";
import BlobPage from "./../pages/Blob";
import Settings from "./../pages/Settings";
import CommitsPage from "./../pages/Commits";
import CommitPage from "./../pages/Commit";
import PullsPage from "./../pages/Pulls";
import PullCreatePage from "./../pages/PullCreate";
import RepoLayoutClear from "../pages/RepoLayout/RepoLayoutClear";

const Router = () => {
  const client = useEverClient();
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  // const location = useLocation(); // TODO: Remove after UI design ready

  useEffect(() => {
      if (!client) return;
      setIsInitialized(true);
  }, [client]);
  // const location:string = useLocation().pathname.split('/').filter(Boolean)[0];

  const navigate = useNavigate();
  const location = useLocation();
  // useEffect(() => {
  //   navigate("/");
  //   location.pathname = "/";
  //   return () => {}
  // }, [])
  
  return (
    <div className={cn("ws-app", useLocation().pathname.split('/').filter(Boolean)[0], {"isMobile": isMobile, "main": !location.pathname.split('/').filter(Boolean)[0]})}>
      <Header
        location={location.pathname.split('/').filter(Boolean)[0] || "main"}
      />
      <main>
        <Routes
          // location="/"
        >
          <Route path="/" element={<HomePage />} />
          <Route path="/account/signin" element={<HomePage action={"signin"} />} />
          <Route path="/account/signup" element={<HomePage action={"signup"} />} />
          <Route path="/account" element={<ProtectedLayout />}>
              <Route element={<Account />}>
                  <Route index element={null} />
                  <Route path="organizations" element={<DaosPage />}>
                    <Route index element={null} />
                    <Route path="create" element={<DaoCreatePage />} />
                  </Route>
                  <Route path="settings" element={<Settings />} />
              </Route>
          </Route>
          <Route path="/organizations/:daoName" element={<ProtectedLayout />}>
            <Route element={<DaoLayout />}>
              <Route element={<DaoPage />} >
                <Route index element={null} />
                <Route path="repositories/create" element={<RepoCreatePage />} />
              </Route>
              <Route path="repositories" element={<ReposPage />}/>
            </Route>
            <Route path="repositories/:repoName/blobs" element={<RepoLayoutClear />}>
              <Route path="create/:branchName" element={<BlobCreatePage />} />
              <Route path="update/:branchName/:blobName" element={<BlobUpdatePage />} />
            </Route>
            <Route path="repositories/:repoName" element={<RepoLayout />}>
              <Route element={<RepoPage />}>
                <Route index element={null} />
                <Route path="branches" element={<BranchesPage />} />
              </Route>
              <Route path="tree/:branchName" element={<RepoPage />} />
              <Route path="blob/:branchName/:blobName" element={<BlobPage />} />
              <Route path="commits/:branchName" element={<CommitsPage />} />
              <Route path="commit/:branchName/:commitName" element={<CommitPage />} />
              <Route path="pulls/create" element={<PullCreatePage />} />
              <Route path="pulls" element={<PullsPage />} />
            </Route>
          </Route>
          <Route path="/containers" element={<Containers />} />
          <Route path="*" element={<p>No match (404)</p>} />
          <Route path="/legal-notes/:id" element={<Content/>} />
        </Routes>
        <ToastContainer/>
      </main>
      <Footer />
    </div>
  );
};

export default Router;
