import { useEffect, useState } from "react";
import { useQuery } from "react-query";

import { Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import { useRecoilValue } from "recoil";
import { Loader, LoaderDotsText, FlexContainer, Flex } from "./../../components";
import { useGoshRoot } from "./../../hooks/gosh.hooks";
import { userStateAtom } from "./../../store/user.state";
import { GoshDao, GoshSmvTokenRoot, GoshWallet } from "../../types/classes";
import { IGoshDao, IGoshRoot } from "./../../types/types";
import Button from '@mui/material/Button';
import { PlusIcon, CollectionIcon, UsersIcon, ArrowRightIcon, EmojiSadIcon, StopIcon } from '@heroicons/react/outline';
import InputBase from '@mui/material/InputBase';
import DaoCreatePage from '../../pages/DaoCreate';


const DaosPage = ({action}: {action?: string}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const userState = useRecoilValue(userStateAtom);
  const goshRoot = useGoshRoot();
  const [search, setSearch] = useState<string>('');

  const daoListQuery = useQuery(
      ['daoList'],
      async (): Promise<{ dao: IGoshDao; supply: number; }[]> => {
          if (!goshRoot || !userState.keys) return [];

          // Get GoshWallet code by user's pubkey and get all user's wallets
          const walletCode = await goshRoot.getDaoWalletCode(`0x${userState.keys.public}`);
          const walletsAddrs = await goshRoot.account.client.net.query_collection({
              collection: 'accounts',
              filter: {
                  code: { eq: walletCode }
              },
              result: 'id'
          });

          // Get GoshDaos from user's GoshWallets
          return await Promise.all(
              (walletsAddrs?.result || []).map(async (item: any) => {
                  // Get GoshDao object
                  const goshWallet = new GoshWallet(goshRoot.account.client, item.id);
                  const daoAddr = await goshWallet.getDaoAddr();
                  const dao = new GoshDao(goshRoot.account.client, daoAddr);
                  await dao.load();

                  // Get GoshDao total supply
                  const smvTokenRootAddr = await dao.getSmvRootTokenAddr();
                  const smvTokenRoot = new GoshSmvTokenRoot(dao.account.client, smvTokenRootAddr);
                  const totalSupply = await smvTokenRoot.getTotalSupply();

                  return { dao, supply: totalSupply };
              })
          );
      },
      {
          enabled: !!goshRoot && !!userState.keys,
          select: (data) => {
              if (!search) return data;
              const pattern = new RegExp(search, 'i');
              return data.filter(({ dao }) => dao.meta && dao.meta.name.search(pattern) >= 0);
          }
      }
  );

  useEffect(() => {
    daoListQuery.refetch();
  }, [location])

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
        placeholder="Search orgranization..."
        autoComplete="off"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
      <div className="divider"></div>
      <div>
        {(daoListQuery.isIdle || daoListQuery.isLoading) && (
          <div className="loader">
            <Loader />
            Loading {"organizations"}...
          </div>
        )}
        {daoListQuery.isFetched && !daoListQuery.data?.length && (
            <div className="no-data"><EmojiSadIcon/>You have no organizations yet</div>
        )}

        <div className="">
          {daoListQuery.data?.map((item, index) => (
              <Link
                key={index}
                to={`/organizations/${item.dao.meta?.name}`}
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
                      {item.dao.meta?.name}
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
                      <Flex>
                        <div className="badge"><StopIcon/>{item.supply}
                          <span className="shell-token">
                            {/* <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                              <path d="M4.5 5.51172H6.86133V4.2312H4.4898L4.5 3.34057H7.85742V5.51172V8.67773C7.4043 8.82227 6.94336 8.93164 6.47461 9.00586C6.00586 9.08008 5.46289 9.11719 4.8457 9.11719C3.54883 9.11719 2.53906 8.73242 1.81641 7.96289C1.09375 7.18945 0.732422 6.10742 0.732422 4.7168C0.732422 3.82617 0.910156 3.04688 1.26562 2.37891C1.625 1.70703 2.14062 1.19531 2.8125 0.84375C3.48438 0.488281 4.27148 0.310547 5.17383 0.310547C6.08789 0.310547 6.93945 0.478516 7.72852 0.814453L7.3418 1.69336C6.56836 1.36523 5.82422 1.20117 5.10938 1.20117C4.06641 1.20117 3.25195 1.51172 2.66602 2.13281C2.08008 2.75391 1.78711 3.61523 1.78711 4.7168C1.78711 5.87305 2.06836 6.75 2.63086 7.34766C3.19727 7.94531 4.02734 8.24414 5.12109 8.24414C5.71484 8.24414 6.29492 8.17578 6.86133 8.03906V6.40234H4.5V5.51172Z"/>
                            </svg> */}
                            <svg width="6" height="9" viewBox="0 0 6 9" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                              <path fillRule="evenodd" clipRule="evenodd" d="M4.57 8.17C5.12 7.75 5.39 7.16 5.39 6.41V6.4C5.39 5.81 5.22 5.34 4.88 4.97C4.58278 4.63675 4.05031 4.32784 3.2899 4.03596V2.20005H2.3999V3.70055C2.16586 3.6027 1.97589 3.50978 1.83 3.42C1.57 3.26 1.39 3.09 1.28 2.9C1.17 2.71 1.12 2.47 1.12 2.17C1.12 1.77 1.27 1.46 1.57 1.23C1.87 1 2.28 0.89 2.81 0.89C3.48 0.89 4.16 1.04 4.87 1.34L5.18 0.47C4.46 0.16 3.65 0 2.83 0C2.01 0 1.36 0.2 0.86 0.59C0.36 0.98 0.11 1.5 0.11 2.16C0.11 2.79 0.28 3.3 0.62 3.7C0.96 4.09 1.53 4.42 2.33 4.71C2.35356 4.71827 2.37686 4.7265 2.3999 4.73469V6.62005H3.2899V5.09121C3.40766 5.14616 3.51091 5.19909 3.6 5.25C3.88 5.41 4.08 5.59 4.2 5.78C4.32 5.97 4.38 6.21 4.38 6.51C4.38 6.95 4.22 7.31 3.88 7.56C3.54 7.81 3.04 7.93 2.38 7.93C1.97 7.93 1.56 7.89 1.15 7.8C0.73 7.72 0.35 7.6 0 7.45V8.41C0.54 8.67 1.32 8.8 2.34 8.8C3.28 8.8 4.02 8.59 4.57 8.17Z"/>
                            </svg>

                          </span> supply
                        </div>
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
