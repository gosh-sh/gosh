import React, { useEffect, useState } from "react";
import { useOutletContext, Outlet, NavLink, Link, useLocation, useParams } from "react-router-dom";
import CopyClipboard from "./../../components/CopyClipboard";
import { shortString } from "./../../utils";
import { Loader, FlexContainer, Flex } from "./../../components";
import ReposPage from "./../Repos";
import Container from '@mui/material/Container';
import InputBase from '@mui/material/InputBase';
import { Typography } from "@mui/material";

import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

import { useRecoilValue } from "recoil";
import { useGoshDao, useGoshWallet } from "../../hooks/gosh.hooks";
import { userStatePersistAtom } from "../../store/user.state";
import { IGoshDao, IGoshWallet } from "../../types/types";

import styles from './Dao.module.scss';
import classnames from "classnames/bind";

import { CogIcon, DatabaseIcon, TicketIcon, UsersIcon, CashIcon } from '@heroicons/react/outline';

const cnb = classnames.bind(styles);

export type TDaoLayoutOutletContext = {
  goshDao: IGoshDao;
  goshWallet?: IGoshWallet;
}

const DaoPage = () => {
  const userStatePersist = useRecoilValue(userStatePersistAtom);

    const { goshDao } = useOutletContext<TDaoLayoutOutletContext>();
    const { daoName } = useParams();

    const goshWallet = useGoshWallet(daoName);
    const [isReady, setIsReady] = useState<boolean>(false);

    const location = useLocation();

    const tabs = [
      { to: `/organizations/${daoName}`, title: 'Repositories', public: true },
      { to: `/organizations/${daoName}/events`, title: 'Events', public: true },
      //{ to: `/organizations/${daoName}/settings`, title: 'Settings' }

      { to: `/organizations/${daoName}/wallet`, title: 'Wallet', public: false },
      { to: `/organizations/${daoName}/participants`, title: 'Participants', public: false }
    ];
  
    useEffect(() => {
      const walletAwaited = !userStatePersist.phrase || (userStatePersist.phrase && goshWallet);
      if (goshDao && walletAwaited) setIsReady(true);
    }, [goshDao, userStatePersist.phrase, goshWallet]);

    const getIcon = (title: string) => {
      switch (title.toLocaleLowerCase()) {
        case "settings":
          return <CogIcon/>
        case "events":
          return <TicketIcon/>
        case "repositories":
          return <DatabaseIcon/>
        case "wallet":
          return <CashIcon/>
        case "participants":
          return <UsersIcon/>
      
        default:
          break;
      }
    };

    return (
        <>
        <Container
            className={"content-container"}
        >
    
          {/* <CreateDaoModal
            showModal={showModal}
            handleClose={() => {
              setShowModal(false);
              navigate("/account/organizations");
            }}
          /> */}
          <div className="left-column">
          {/* <h2 className="font-semibold text-2xl mb-5">User account</h2> */}
          {!isReady && <div className="loader">
            <Loader />
            Loading {"organization"}...
            </div>}
          {isReady && (<>
            <Flex
              grow={0}
            >
              <h2 className="color-faded">{goshDao.meta?.name}</h2>
            </Flex>
            <Flex
              grow={1}
            >

              <List
                  className={"menu-list"}
                >

              {tabs
              .filter((item) => !goshWallet ? item.public : item)
              .map((item, index) => (
                <ListItem
                  key={index}
                  className={"menu-list-item"}
                >
                  <NavLink
                    key={index}
                    to={item.to}
                    className={({ isActive }) => {
                      if (item.title.toLowerCase() !== "repositories") {
                        if (isActive && item.title.toLowerCase() !== "repositories") return cnb("menu-list-item-active");
                      } else {
                        if (item.to.toLowerCase() === location.pathname.toLowerCase()) return cnb("menu-list-item-active");
                      }
                    }}
                  >
                    <ListItemButton
                      className={"menu-list-item-button"}
                    >
                      <ListItemIcon
                      className={"menu-list-item-icon"}
                    >
                        {getIcon(item.title)}
                      </ListItemIcon>
                      <ListItemText
                        className={"menu-list-item-text"}
                        primary={item.title}
                      />
                    </ListItemButton>
                  </NavLink>
                </ListItem>
                ))}
              </List>
            </Flex>
            <Flex
              grow={0}
            >
              <Typography>
                DAO address
              </Typography>
                <CopyClipboard
                  className={cnb("address")}
                  label={shortString(goshDao.address)}
                  componentProps={{
                    text: goshDao.address
                  }}
                />
                <div className={cnb("wallet-address")}>

                  <Typography>User wallet address</Typography>

                  <div className={cnb("wallet-address-copy-wrapper")}>
                    <InputBase
                      className="input-field"
                      type="text"
                      value={goshWallet?.address || ""}
                      onChange={() => {}}
                      disabled
                      />
                      <CopyClipboard
                          componentProps={{
                            text: goshWallet?.address || ""
                          }}
                      />

                  </div>
                </div>
              </Flex>
            </>
          )}
  
        </div>
        <div className="right-column">
          <Outlet context={{ goshDao, goshWallet }} />
        </div>
      </Container>
    </>
    );
}

export default DaoPage;
