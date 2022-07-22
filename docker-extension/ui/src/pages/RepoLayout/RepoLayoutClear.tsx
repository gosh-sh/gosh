import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useParams, useLocation } from "react-router-dom";
import { Loader } from "../../components";
import { useGoshRepo, useGoshWallet, useGoshRepoBranches } from "../../hooks/gosh.hooks";
import { IGoshRepository, IGoshWallet } from "../../types/types";
import CopyClipboard from "./../../components/CopyClipboard";
import { shortString } from "./../../utils";

import { Icon, FlexContainer, Flex } from '../../components';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

import { TRepoLayoutOutletContext } from './RepoLayout';

import { CodeIcon } from '@heroicons/react/outline';

import styles from './RepoLayout.module.scss';
import classnames from "classnames/bind";

const cnb = classnames.bind(styles);

const RepoLayoutClear = () => {
    const { daoName, repoName } = useParams();
    const location = useLocation();
    const goshRepo = useGoshRepo(daoName, repoName);
    const goshWallet = useGoshWallet(daoName);
    const { updateBranches } = useGoshRepoBranches(goshRepo);
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


    const tabs = isFetched ? [
        { to: `/organizations/${daoName}/repositories/${repoName}`, title: 'Code', icon: <CodeIcon/> },
        { to: `/organizations/${daoName}/repositories/${repoName}/pulls`, title: 'Pull requests', icon: <Icon icon={"pull-request"}/> },
        // { to: `/organizations/${daoName}/repositories/${repoName}/branches`, title: 'Branches', icon: <Icon icon={"branches"}/> },
    ]
    : [
      { to: ``, title: 'Code', icon: <CodeIcon/> },
      { to: ``, title: 'Pull requests', icon: <Icon icon={"pull-request"}/> },
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
    
    <Container
    className={"content-container-fullwidth"}
  >
    <Outlet context={{ goshRepo, goshWallet }} />
  </Container>
  </>
    );
}

export default RepoLayoutClear;
