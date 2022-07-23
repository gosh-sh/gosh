import React, { useEffect } from "react";
import { Outlet, useParams } from "react-router-dom";
import { useGoshRepo, useGoshWallet, useGoshRepoTree, useGoshRepoBranches } from "../../hooks/gosh.hooks";
import Container from '@mui/material/Container';
import { goshCurrBranchSelector } from "../../store/gosh.state";
import { RecoilValueReadOnly, useRecoilValue } from "recoil";



const RepoLayoutBase = () => {
  const { daoName, repoName, branchName = "main" } = useParams();
  const goshRepo = useGoshRepo(daoName, repoName);
  const goshWallet = useGoshWallet(daoName);

  const { updateBranches } = useGoshRepoBranches(goshRepo);
  const branch = useRecoilValue(goshCurrBranchSelector(branchName));
  const goshRepoTree = useGoshRepoTree(goshRepo, branch);


  useEffect(() => {
      const init = async () => {
          await updateBranches();
          console.debug('Repo addr:', goshRepo?.address);
          console.debug('Wallet addr:', goshWallet?.address);
      }

      if (goshRepo && goshWallet) init();
  }, [goshRepo, goshWallet, updateBranches]);

    return (<>    
    <Container
    className={"content-container-fullwidth"}
  >
    <Outlet context={{ goshRepo, goshWallet, goshRepoTree }} />
  </Container>
  </>
    );
}

export default RepoLayoutBase;
