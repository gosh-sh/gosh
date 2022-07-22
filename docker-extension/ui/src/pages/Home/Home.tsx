import { useState, useEffect } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import { Modal } from "./../../components";
import Button from '@mui/material/Button'

import Typography from '@mui/material/Typography';

import { SigninPage, SignupPage } from '../../pages';

import Logo from "./../../assets/images/logo.png";
import { Container } from "@mui/material";
import styles from './Home.module.scss';
import classnames from "classnames/bind";
import { useRecoilValue } from "recoil";
import { userStateAtom } from "./../../store/user.state";

const cnb = classnames.bind(styles);

export const Home = ({action}: {action?: string}) => {
  const [showSigninModal, setShowSigninModal] = useState<boolean>(action === "signin");
  const [showSignupModal, setShowSignupModal] = useState<boolean>(action === "signup");

  const userState = useRecoilValue(userStateAtom);

  const location = useLocation();
  const navigate = useNavigate();

    useEffect(() => {
        switch (action) {
        case "signin":
            setShowSigninModal(true);
            break;
        case "signup":
            setShowSignupModal(true);
            break;

        default:
            break;
        }
    }, [action])
  
  const SigninModal = ({showModal, handleClose}: {
    showModal: boolean,
    handleClose: any,
  }) => {
    return (
      <Modal
        show={showModal}
        onHide={handleClose}
        className={cnb("modal")}
      >
        <SigninPage/>
      </Modal>
    )
  };

  const SignupModal = ({showModal, handleClose}: {
    showModal: boolean,
    handleClose: any,
  }) => {
    return (
      <Modal
        show={showModal}
        onHide={handleClose}
        className={cnb("modal")}
      >
        <SignupPage/>
      </Modal>
    )
  };

  return <Container>
    <div className={cnb("home")}>
        <SigninModal
            showModal={showSigninModal}
            handleClose={() => {
                setShowSigninModal(false);
                navigate("/");
            }}
        />
        <SignupModal
        showModal={showSignupModal}
        handleClose={() => {
            setShowSignupModal(false)
            navigate("/");
        }}
        />
        {/* <img src={Logo}/> */}
        <div className={cnb("logo-main")}></div>
        <Typography variant="h4">Git Open Source Hodler</Typography>
        <Typography>
          GOSH secures delivery and decentralization of your code. The first development platform blockchain, purpose-built for securing the software supply chain and extracting the value locked in your projects.
        </Typography>

        <div className={cnb("button-flex")}>
        {userState && userState.phrase 
        ? <div className={cnb("button-flex")}>
        <Button
            color="inherit"
            size="large"
            className="button-cta button-cta-pale"
            disableElevation
            // icon={<Icon icon={"arrow-up-right"}/>}
            // iconAnimation="right"
            // iconPosition="after"
            onClick={() => {
                //setShowSigninModal(true);
                navigate("/account/organizations");
            }}
            >Account &amp; Organizations</Button>
        </div>
        : <div className={cnb("button-flex")}>
        <Button
            color="inherit"
            size="large"
            className="button-cta button-cta-pale"
            disableElevation
            // icon={<Icon icon={"arrow-up-right"}/>}
            // iconAnimation="right"
            // iconPosition="after"
            onClick={() => {
                //setShowSigninModal(true);
                navigate("/account/signin");
            }}
            >Sign In</Button>
        <Button
            disableElevation
            color="primary"
            className="button-cta"
            variant="contained"
            size="large"
            onClick={() => {
                //setShowSignupModal(true);
                navigate("/account/signup");
            }}
            >Create account</Button>
        </div>}
    </div>
    </div>
  </Container>
};

export default Home;