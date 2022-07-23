import { useState } from 'react';
import { createDockerDesktopClient } from '@docker/extension-api-client';

import Box from '@mui/material/Box';
import { ReactComponent as Logo } from './../../assets/images/logo.svg';
import { Link } from 'react-router-dom';
import styles from './Header.module.scss';
import classnames from 'classnames/bind';
import Button from '@mui/material/Button';

import { Overlay } from '../../components';
import { Content } from '../../pages';

const cnb = classnames.bind(styles);

const Help = ({ showModal, handleClose }: { showModal: boolean; handleClose: any }) => {
    return (
        <Overlay show={showModal} onHide={handleClose} className={cnb('modal')}>
            <Content path="help" />
        </Overlay>
    );
};

export const Header = ({ location, ...props }: { location: string }) => {
    const ddClient = createDockerDesktopClient();
    const [showModal, setShowModal] = useState<boolean>(false);

    const handleClose = () => setShowModal(false);
    const handleShow = () => setShowModal(true);

    return (
        <>
            <Link to={''} className={cnb('logo')}>
                <Logo />
            </Link>
            <Help showModal={showModal} handleClose={handleClose} />
            <header className={cnb('header')}>
                <Box
                    className={cnb('navbar')}
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                    }}
                >
                    <div className={cnb('button-block')}>
                        <a href="../v2/index.html">
                            <Button color="primary" size="medium" disableElevation>
                                Repositories
                            </Button>
                        </a>
                    </div>
                    <div className={cnb('button-block-right')}>
                        <a href="https://t.me/gosh_sh" target="_blank" rel="noreferrer">
                            <Button
                                color="inherit"
                                size="medium"
                                className={cnb('button-telegram')}
                                disableElevation
                                onClick={(e) => {
                                    e.preventDefault();
                                    ddClient.host.openExternal('https://t.me/gosh_sh');
                                }}
                            >
                                <svg
                                    width="128"
                                    height="128"
                                    viewBox="0 0 128 128"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M64 0C47.03 0 30.74 6.747 18.75 18.745C6.75 30.743 0 47.033 0 64C0 80.967 6.75 97.257 18.75 109.255C30.74 121.253 47.03 128 64 128C80.97 128 97.26 121.253 109.25 109.255C121.25 97.257 128 80.967 128 64C128 47.033 121.25 30.743 109.25 18.745C97.26 6.747 80.97 0 64 0V0Z"
                                        fill="url(#paint0_linear_1224_576)"
                                    />
                                    <path
                                        d="M28.9702 63.3238C47.6302 55.1958 60.0701 49.8368 66.2901 47.2478C84.0701 39.8548 87.76 38.5708 90.17 38.5278C90.7 38.5188 91.8799 38.6498 92.6499 39.2728C93.2899 39.7978 93.4701 40.5078 93.5601 41.0058C93.6401 41.5038 93.7502 42.6388 93.6602 43.5248C92.7002 53.6448 88.5302 78.2028 86.4102 89.5378C85.5202 94.334 83.7501 95.942 82.0401 96.099C78.3201 96.441 75.4999 93.643 71.8999 91.2838C66.2699 87.5908 63.0902 85.2928 57.6202 81.6898C51.3002 77.5258 55.4 75.2368 59 71.4968C59.94 70.5178 76.3199 55.6228 76.6299 54.2718C76.6699 54.1028 76.7101 53.4728 76.3301 53.1408C75.9601 52.8078 75.4098 52.9218 75.0098 53.0118C74.4398 53.1398 65.4498 59.0878 48.0098 70.8548C45.4598 72.6088 43.1499 73.4638 41.0699 73.4188C38.7899 73.3698 34.3902 72.1268 31.1202 71.0648C27.1202 69.7618 23.93 69.0728 24.21 66.8598C24.35 65.7078 25.9402 64.5288 28.9702 63.3238V63.3238Z"
                                        fill="white"
                                    />
                                    <defs>
                                        <linearGradient
                                            id="paint0_linear_1224_576"
                                            x1="64"
                                            y1="0"
                                            x2="64"
                                            y2="128"
                                            gradientUnits="userSpaceOnUse"
                                        >
                                            <stop stopColor="#2AABEE" />
                                            <stop offset="1" stopColor="#229ED9" />
                                        </linearGradient>
                                    </defs>
                                </svg>{' '}
                                Our telegram
                            </Button>
                        </a>
                        <Button
                            color="inherit"
                            size="medium"
                            disableElevation
                            onClick={handleShow}
                        >
                            Help
                        </Button>
                    </div>
                </Box>
            </header>
        </>
    );
};

export default Header;
