import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useParams, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { BranchSelect, Loader } from "../../components";
import { useGoshRepo, useGoshWallet, useGoshRepoBranches, useGoshRepoTree } from "../../hooks/gosh.hooks";
import { IGoshRepository, IGoshWallet, TGoshTree, TGoshTreeItem } from "../../types/types";
import CopyClipboard from "../../components/CopyClipboard";
import { shortString } from "../../utils";
import { RecoilValueReadOnly, useRecoilValue } from "recoil";
import { goshCurrBranchSelector, goshBranchesAtom } from "../../store/gosh.state";
import { TRepoLayoutOutletContext } from "../RepoLayout";

import { Icon, FlexContainer, Flex } from '../../components';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import InputBase from '@mui/material/InputBase';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

import { styled } from '@mui/material/styles';

import { CodeIcon } from '@heroicons/react/outline';

import styles from './BlobLayout.module.scss';
import classnames from "classnames/bind";

const cnb = classnames.bind(styles);

const BlobLayout = () => {
    const { daoName, repoName, branchName = 'main' } = useParams();
    const pathName = useParams()['*'];
    const { goshRepo, goshWallet, goshRepoTree } = useOutletContext<TRepoLayoutOutletContext>();
    const location = useLocation();
    const navigate = useNavigate();
    const branches = useRecoilValue(goshBranchesAtom);
    const { updateBranches } = useGoshRepoBranches(goshRepo);
    const branch = useRecoilValue(goshCurrBranchSelector(branchName));
    const [isFetched, setIsFetched] = useState<boolean>(false);

    useEffect(() => {
        const init = async () => {
            await updateBranches();
            setIsFetched(true);
            console.debug('Repo addr:', goshRepo?.address);
            console.debug('Wallet addr:', goshWallet?.address);
        }

        if (goshRepo && goshWallet) init();
    }, [goshRepo, goshWallet, updateBranches]);

    useEffect(() => {
      console.log(goshRepoTree);
    }, [goshRepoTree]);


    const tabs = isFetched ? [
        { to: `/organizations/${daoName}/repositories/${repoName}`, title: 'Code', icon: <CodeIcon/> },
        { to: `/organizations/${daoName}/repositories/${repoName}/pull`, title: 'Pull request', icon: <Icon icon={"pull-request"}/> },
        // { to: `/organizations/${daoName}/repositories/${repoName}/branches`, title: 'Branches', icon: <Icon icon={"branches"}/> },
    ]
    : [
      { to: ``, title: 'Code', icon: <CodeIcon/> },
      { to: ``, title: 'Pull request', icon: <Icon icon={"pull-request"}/> },
      // { to: `/organizations/${daoName}/repositories/${repoName}/branches`, title: 'Branches', icon: <Icon icon={"branches"}/> },
  ];

    const [value, setValue] = useState<string>();
  
    const handleChange = (event: React.SyntheticEvent, newValue: string) => {
      setValue(newValue);
    };

    useEffect(() => {
      setValue(tabs[0].to);
    }, [isFetched])

    return (<>

    <div className="header-row" style={{paddingBottom: "24px"}}>
      
      <FlexContainer
        direction="row"
        justify="flex-start"
        align="center"
        
      >
        <Flex
          style={{marginRight: "16px"}}
        >
          
          
          <h2 className="color-faded no-margin">
              <Link to={`/organizations/${daoName}`} className="font-semibold text-xl hover:underline">
                  {daoName}
              </Link>
              <span className={"color-black"}> / </span>
              <Link to={`/organizations/${daoName}/repositories/${repoName}`} className="font-semibold text-xl hover:underline">
                  {repoName}
              </Link>
              <span className={"color-black"}> / </span>

                <span>{pathName}</span>

          </h2>
        </Flex>
        <Flex
          grow={1}
          style={{textAlign: "right", marginLeft: "auto"}}
        >
          
    </Flex>
      </FlexContainer>
    </div>
    <div className="main-row">
        <BranchSelect
          branch={branch}
          branches={branches}
          style={{marginBottom: "1rem"}}
          onChange={(selected) => {
              if (selected) {
                  navigate(`/organizations/${daoName}/repositories/${repoName}/blobs/${selected.name}/${pathName}`);
              }
          }}
      />
      <Outlet context={{ goshRepo, goshWallet, goshRepoTree }} />
    </div>
  </>
    );
}

export default BlobLayout;
