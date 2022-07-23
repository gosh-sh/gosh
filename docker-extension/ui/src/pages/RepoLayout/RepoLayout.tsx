import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useParams, useLocation, useOutletContext } from "react-router-dom";
import { Loader } from "../../components";
import { useGoshRepo, useGoshWallet, useGoshRepoBranches, useGoshRepoTree } from "../../hooks/gosh.hooks";
import { IGoshRepository, IGoshWallet, TGoshTree, TGoshTreeItem } from "../../types/types";
import CopyClipboard from "./../../components/CopyClipboard";
import { shortString } from "./../../utils";
import { RecoilValueReadOnly, useRecoilValue } from "recoil";
import { goshCurrBranchSelector } from "../../store/gosh.state";


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

import styles from './RepoLayout.module.scss';
import classnames from "classnames/bind";

const cnb = classnames.bind(styles);


export type TRepoLayoutOutletContext = {
    goshRepo: IGoshRepository;
    goshWallet: IGoshWallet;
    goshRepoTree: {
      tree: { tree: TGoshTree; items: TGoshTreeItem[] };
      getSubtree(path?: string): RecoilValueReadOnly<TGoshTreeItem[]>;
      getTreeItems(path?: string): RecoilValueReadOnly<TGoshTreeItem[]>;
      getTreeItem(path?: string): RecoilValueReadOnly<TGoshTreeItem>;
  };
}

const RepoLayout = () => {
    const { daoName, repoName, branchName = 'main' } = useParams();
    const { goshRepo, goshWallet } = useOutletContext<TRepoLayoutOutletContext>();
    const location = useLocation();
    const { updateBranches } = useGoshRepoBranches(goshRepo);
    const branch = useRecoilValue(goshCurrBranchSelector(branchName));
    const goshRepoTree = useGoshRepoTree(goshRepo, branch);
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

    <div className="header-row">
      
      <FlexContainer
        direction="row"
        justify="space-between"
        align="center"
      >
        <Flex>
          
          <h2 className="color-faded no-margin">
              <Link to={`/organizations/${daoName}`} className="font-semibold text-xl hover:underline">
                  {daoName}
              </Link>
              <span className={"color-black"}> / </span>

                <span>{repoName}</span>

          </h2>
        </Flex>
        <Flex>
          
          <CopyClipboard
              componentProps={{
                  text: goshRepo?.address || ""
              }}
              label={<Typography>{shortString(goshRepo?.address || "")}</Typography>}
          />
        </Flex>
      </FlexContainer>

      <Tabs
        className={"menu-tab"}
        value={isFetched && value ? value : false}
        onChange={handleChange}
      >

      {tabs.length && tabs.map((item, index) => (
        <Tab
          key={index}
          className={"tab-list-item"}
          to={item.to}
          disabled={!isFetched}
          value={item.to}
          component={Link}
          icon={item.icon}
          iconPosition="start"
          label={item.title}
        />
        ))}
      </Tabs>
    </div>
    <div className="main-row">
      <Outlet context={{ goshRepo, goshWallet, goshRepoTree }} />
    </div>
  </>
    );
}

export default RepoLayout;
