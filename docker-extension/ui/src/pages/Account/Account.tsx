
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import { styled } from '@mui/material/styles';
import styles from './Account.module.scss';
import classnames from "classnames/bind";
import { CogIcon, UserGroupIcon, DatabaseIcon } from '@heroicons/react/outline';

import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

import { useSetRecoilState, useRecoilValue } from "recoil";
import { userStateAtom, userStatePersistAtom } from "../../store/user.state";

import { NavLink, Outlet } from "react-router-dom";

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: 'center',
  color: theme.palette.text.secondary,
  borderRadius: '4px!important',
}));

const ItemTransparent = styled(Paper)(({ theme, elevation = 2 }) => ({
  backgroundColor: 'transparent',
  padding: theme.spacing(1),
  textAlign: 'center',
  color: theme.palette.text.secondary,
  borderRadius: '4px!important',
}));

const cnb = classnames.bind(styles);

export const Account = () => {
  const userStatePersist = useRecoilValue(userStatePersistAtom);
  const userState = useRecoilValue(userStateAtom);
  
  const tabs = [
    { to: '/account/organizations', title: 'Organizations' },
    { to: '/account/repositories', title: 'Repositories', disabled: true},
    { to: '/account/settings', title: 'Settings' }
  ];

  const getIcon = (title: string) => {
    switch (title.toLocaleLowerCase()) {
      case "settings":
        return <CogIcon/>
      case "repositories":
        return <DatabaseIcon/>
      case "organizations":
        return <UserGroupIcon/>
    
      default:
        break;
    }
  }
  return (
    userState.phrase ? <Container
      className={"content-container"}
    >
      {userState.phrase && <><div className="left-column">
        {/* <h2 className="font-semibold text-2xl mb-5">User account</h2> */}

        <List
            className={"menu-list"}
          >

        {tabs.map((item, index) => (
          <ListItem
            key={index}
            disabled={item.disabled}
            className={cnb("menu-list-item", {"menu-list-item-disabled" : item.disabled})}
          >
            <NavLink
              key={index}
              to={item.to}
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
      </div>
      <div className="right-column">
        <Outlet />
      </div></>}
    </Container> : <></>
  );
}

export default Account;
