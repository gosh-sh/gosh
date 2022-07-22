import { useOutletContext, Outlet, Link } from "react-router-dom";
import CopyClipboard from "./../../components/CopyClipboard";
import { shortString } from "./../../utils";
import { TDaoLayoutOutletContext } from "./../DaoLayout";
import { Loader, FlexContainer, Flex } from "./../../components";
import ReposPage from "./../Repos";
import Button from '@mui/material/Button';
import { PlusIcon, CollectionIcon, UsersIcon, ArrowRightIcon, EmojiSadIcon } from '@heroicons/react/outline';
import InputBase from '@mui/material/InputBase';
import { useGoshWallet } from "../../hooks/gosh.hooks";
import { Typography } from "@mui/material";

import styles from './Dao.module.scss';
import classnames from "classnames/bind";

const cnb = classnames.bind(styles);

const DaoPage = () => {
    const { goshDao } = useOutletContext<TDaoLayoutOutletContext>();

    const goshWallet = useGoshWallet(goshDao && goshDao.meta?.name);

    return (
        <>
    
          {/* <CreateDaoModal
            showModal={showModal}
            handleClose={() => {
              setShowModal(false);
              navigate("/account/organizations");
            }}
          /> */}
          <div className="left-column">
          {/* <h2 className="font-semibold text-2xl mb-5">User account</h2> */}
          {!goshDao && <div className="loader">
            <Loader />
            Loading {"organization"}...
            </div>}
          {goshDao && (<>
            <h2 className="color-faded">{goshDao.meta?.name}</h2>
            <Outlet context={{ goshDao }} />
            <Typography>
              This is a Gosh test organization
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
            </>
          )}
  
        </div>
        <div className="right-column">
        {!goshDao && (
                <>
                <div className="page-header">
                  <FlexContainer
                      direction="row"
                      justify="space-between"
                      align="flex-start"
                  >
                    <Flex>
                        <h2>Repositories</h2>
                    </Flex>
                    <Flex>
                        <Link
                            className="btn btn--body px-4 py-1.5 text-sm !font-normal"
                            to={`/organizations/repositories/create`}
                        >
                            <Button
                                color="primary"
                                variant="contained"
                                size="medium"
                                className={"btn-icon"}
                                disableElevation
                                // icon={<Icon icon={"arrow-up-right"}/>}
                                // iconAnimation="right"
                                // iconPosition="after"
                            ><PlusIcon/> Create</Button>
                        </Link>
                    </Flex>
                </FlexContainer>
                <InputBase
                  className="input-field"
                  type="text"
                  placeholder="Search repositories"
                  autoComplete={'off'}
                  onChange={() =>{}}
                />
                <div className="divider"></div>
          
              </div>
            <div className="loader">
            <Loader />
            Loading {"repositories"}...
            </div>
                </>
            )}
            {goshDao && (
                <ReposPage />
            )}
        </div>
    </>
    );
}

export default DaoPage;
