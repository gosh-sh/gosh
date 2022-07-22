import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import { useRecoilValue } from "recoil";
import { Loader, LoaderDotsText, FlexContainer, Flex } from "./../../components";
import { useGoshRoot } from "./../../hooks/gosh.hooks";
import { userStateAtom } from "./../../store/user.state";
import { GoshDao, GoshWallet } from "./../../types/classes";
import { IGoshDao, IGoshRoot } from "./../../types/types";
import Button from '@mui/material/Button';
import { PlusIcon, CollectionIcon, UsersIcon, ArrowRightIcon, EmojiSadIcon } from '@heroicons/react/outline';
import InputBase from '@mui/material/InputBase';
import DaoCreatePage from '../../pages/DaoCreate';


const DaosPage = ({action}: {action?: string}) => {
  const userState = useRecoilValue(userStateAtom);
  const goshRoot = useGoshRoot();
  const navigate = useNavigate();
  const location = useLocation();
  const [goshDaos, setGoshDaos] = useState<IGoshDao[]>();

  useEffect(() => {
      const getDaoList = async (goshRoot: IGoshRoot, pubkey: string) => {
          // Get GoshWallet code by user's pubkey and get all user's wallets
          const walletCode = await goshRoot.getDaoWalletCode(`0x${pubkey}`);
          console.debug('GoshWallet code:', walletCode);
          const walletsAddrs = await goshRoot.account.client.net.query_collection({
              collection: 'accounts',
              filter: {
                  code: { eq: walletCode }
              },
              result: 'id'
          });
          console.debug('GoshWallets addreses:', walletsAddrs?.result || []);

          // Get GoshDaos from user's GoshWallets
          const daos = await Promise.all(
              (walletsAddrs?.result || []).map(async (item: any) => {
                  const goshWallet = new GoshWallet(goshRoot.account.client, item.id);
                  const daoAddr = await goshWallet.getDaoAddr();
                  const dao = new GoshDao(goshRoot.account.client, daoAddr);
                  await dao.load();
                  return dao;
              })
          );
          console.debug('GoshDaos:', daos);
          setGoshDaos(daos);
      }

      if (goshRoot && userState.keys) getDaoList(goshRoot, userState.keys.public);
  }, [userState.keys, goshRoot, location.pathname]);

  return (
    <>

      {/* <CreateDaoModal
        showModal={showModal}
        handleClose={() => {
          setShowModal(false);
          navigate("/account/organizations");
        }}
      /> */}
      <Outlet/>
      <div className="page-header">
        <FlexContainer
            direction="row"
            justify="space-between"
            align="flex-start"
            className="page-header-flex"
        >
          <Flex
            className="overflow-ellipsis"
          >
              <h2>Organizations</h2>
          </Flex>
          <Flex>
              <Link
                  to="/account/organizations/create"
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
        placeholder="Search orgranizations (Disabled for now)"
        disabled
      />
    </div>
      <div className="divider"></div>
      <div>
        {goshDaos === undefined && (
          <div className="loader">
            <Loader />
            Loading {"organizations"}...
          </div>
        )}
        {!goshDaos?.length && goshDaos !== undefined &&  (
            <div className="no-data"><EmojiSadIcon/>You have no organizations yet</div>
        )}

        <div className="">
            {goshDaos?.map((item, index) => (
              <Link
                key={index}
                to={`/organizations/${item.meta?.name}`}
              >
                <FlexContainer
                  className="organization"
                  direction="column"
                  justify="space-between"
                  align="stretch"
                >
                  <Flex>
                    <div className="arrow"><ArrowRightIcon/></div>
                    <div className="organization-title">
                      {item.meta?.name}
                    </div>
                    <div className="organization-description">
                      This is a Gosh test organization
                    </div>
                  </Flex>
                  <Flex
                    className="organization-footer"
                  >
                    <FlexContainer
                      direction="row"
                      justify="flex-start"
                      align="center"
                    >
                      <Flex>
                        <div className="badge"><CollectionIcon/> <LoaderDotsText className={"badge-loader"}/> repositories</div>
                      </Flex>
                      <Flex>
                        <div className="badge"><UsersIcon/> <LoaderDotsText className={"badge-loader"}/> members</div>
                      </Flex>
                    </FlexContainer>
                  </Flex>
                </FlexContainer>
              </Link>
            ))}
        </div>
      </div>
    </>
  );
}

export default DaosPage;
