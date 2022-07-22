import { useState, useEffect } from "react";

import Box from '@mui/material/Box';
import { ReactComponent as Logo } from "./../../assets/images/logo.svg";
import { Link } from "react-router-dom";
import styles from "./Header.module.scss";
import classnames from "classnames/bind";
import Button from '@mui/material/Button'

const cn = classnames.bind(styles);

export const Header = ({location, ...props}: {location: string}) => {
  return (<>
    <header className={cn("header")}>
    <Box
      className={cn("navbar")}
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
      }}
    > 
        <Link to={""} className={cn("logo")}><Logo/></Link>

        <div className={cn("button-block")}>
          <Link to="/account/organizations"><Button
            color="primary"
            size="medium"
            disableElevation
            // icon={<Icon icon={"arrow-up-right"}/>}
            // iconAnimation="right"
            // iconPosition="after"
          >Repositories</Button></Link>
          <Link to="/containers"><Button
            disableElevation
            color="primary"
            variant="contained"
            size="medium"
          >Containers</Button></Link>
        </div>
      </Box>
    </header>
    </>
  );
};

export default Header;
