import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import CopyClipboard from "../../components/CopyClipboard";
import { useGoshDao, useGoshRoot, useGoshWallet } from "../../hooks/gosh.hooks";
import { GoshCommit, GoshRepository, GoshSmvClient, GoshSmvLocker, GoshSmvProposal } from "../../types/classes";
import { IGoshCommit, IGoshDao, IGoshRoot, IGoshSmvLocker, IGoshSmvProposal, IGoshWallet } from "../../types/types";
import { classNames, shortString } from "../../utils";
import { Loader, LoaderDotsText, FlexContainer, Flex, Modal } from "./../../components";
import { EmojiSadIcon } from '@heroicons/react/outline';

import styles from './Events.module.scss';
import classnames from "classnames/bind";
import EventsListItem from "./EventsListItem";

const cnb = classnames.bind(styles);

const StatusDot  = ({status}: {status: string}) => <div className={cnb("status-dot", status)}></div>

const EventsPage = () => {
    const { daoName, repoName } = useParams();
    const goshRoot = useGoshRoot();
    const goshDao = useGoshDao(daoName);
    const goshWallet = useGoshWallet(daoName);
    const [proposals, setProposals] = useState<{ prop: IGoshSmvProposal; commit?: IGoshCommit; locked: number; }[]>();
    const [service, setService] = useState<{ locker?: IGoshSmvLocker; balance: number; }>({ locker: undefined, balance: 0 });

    const getPullList = async (goshRoot: IGoshRoot, goshDao: IGoshDao, goshWallet: IGoshWallet) => {
        // Get SMVProposal code
        const proposalCode = await goshDao.getSmvProposalCode();
        // console.debug('SMVProposal code:', proposalCode);
        const proposalssAddrs = await goshDao.account.client.net.query_collection({
            collection: 'accounts',
            filter: {
                code: { eq: proposalCode }
            },
            result: 'id'
        });
        console.debug('[Pulls] - SMVProposal addreses:', proposalssAddrs?.result || []);

        const proposals = await Promise.all(
            (proposalssAddrs?.result || [])
                .map(async (item: any) => {
                    // Get GoshProposal object
                    console.debug('[Pulls] - Prop addr:', item.id)
                    const proposal = new GoshSmvProposal(goshDao.account.client, item.id);
                    await proposal.load();

                    // Get commit
                    let commit = undefined;
                    if (proposal.meta?.commit && daoName) {
                        const repoAddr = await goshRoot.getRepoAddr(
                            proposal.meta.commit.repoName,
                            daoName
                        );
                        const goshRepo = new GoshRepository(goshDao.account.client, repoAddr);
                        const commitAddr = await goshRepo.getCommitAddr(proposal.meta.commit.commitName);
                        commit = new GoshCommit(goshDao.account.client, commitAddr);
                        await commit.load();
                    };

                    // Get amount of user's locked tokens in proposal
                    let locked = 0;
                    if (proposal.meta) {
                        const propLockerAddr = await proposal.getLockerAddr();
                        console.log('[propLockerAddr]', propLockerAddr);
                        const smvClientAddr = await goshWallet.getSmvClientAddr(
                            propLockerAddr,
                            proposal.meta.id
                        );
                        console.log('[svmClientAddr]', smvClientAddr);
                        try {
                            const smvClient = new GoshSmvClient(goshWallet.account.client, smvClientAddr);
                            locked = await smvClient.getLockedAmount();
                        } catch { }
                    }

                    return { prop: proposal, commit, locked };
                })
        );
        console.debug('SMVProposals:', proposals);
        setProposals(proposals);
    }

    useEffect(() => {
        if (!repoName && goshRoot && goshDao && goshWallet) getPullList(goshRoot, goshDao, goshWallet);
    }, [repoName, goshRoot, goshDao, goshWallet]);

    useEffect(() => {
        const initService = async (wallet: IGoshWallet) => {
            const lockerAddr = await wallet.getSmvLockerAddr();
            const locker = new GoshSmvLocker(wallet.account.client, lockerAddr);
            const balance = await wallet.getSmvTokenBalance();
            setService({ locker, balance });
        }

        if (goshWallet && !service.locker) initService(goshWallet);

        let interval: any;
        if (goshWallet && service?.locker) {
            interval = setInterval(async () => {
                await service.locker?.load();
                const balance = await goshWallet.getSmvTokenBalance();
                console.debug('[Locker] - Busy:', service.locker?.meta?.isBusy);
                setService((prev) => ({ ...prev, balance }));
            }, 5000);
        }

        return () => {
            clearInterval(interval);
        }
    }, [goshWallet, service?.locker]);

    return (
        <>
          <div className="page-header">
            <FlexContainer
                direction="column"
                justify="space-between"
                align="stretch"
            >
              <Flex>
                  <h2>Events</h2>
              </Flex>
              <Flex>
        <div className="bordered-block px-7 py-8">
            <div>
                <FlexContainer
                    className={cnb("smv-summary")}
                    direction="row"
                    justify="space-between"
                    align="center"
                >
                    <Flex
                        grow={0}
                        className={cnb("smv-summary-item")}
                    >
                        <span className={cnb("smv-summary-title")}>SMV balance:</span>
                        {service.locker?.meta?.votesTotal !== undefined ? service.locker?.meta?.votesTotal : <LoaderDotsText />}
                    </Flex>
                    <Flex
                        grow={0}
                        className={cnb("smv-summary-item")}
                    >
                        <span className={cnb("smv-summary-title")}>Locked:</span>
                        {service.locker?.meta?.votesLocked !== undefined ? service.locker?.meta?.votesLocked : <LoaderDotsText />}
                    </Flex>
                    <Flex
                        grow={0}
                        className={cnb("smv-summary-item")}
                    >
                        <span className={cnb("smv-summary-title")}>Wallet balance:</span>
                        {service.balance !== undefined ? service.balance : <LoaderDotsText />}
                    </Flex>
                    <Flex 
                        grow={1}
                        className={cnb("smv-summary-item-status")}
                        align="flex-end"
                    >
                        <StatusDot status={service.locker?.meta?.isBusy ? "error" : "success" }/>
                    </Flex>
                </FlexContainer>

                <div className="divider"></div>

                {proposals === undefined && (
                    <div className="loader">
                    <Loader />
                    Loading {"proposals"}...
                  </div>
                )}
                {proposals && !proposals?.length && (
                     <div className="no-data"><EmojiSadIcon/>There are no proposals</div>
                )}

                <div className="divide-y divide-gray-c4c4c4">
                    {proposals?.map((item, index) =>  <EventsListItem key={index} event={item} daoName={daoName} />)}
                </div>
            </div>
        </div>
              </Flex>
              </FlexContainer>
        </div>
              </>
    );
}

export default EventsPage;
