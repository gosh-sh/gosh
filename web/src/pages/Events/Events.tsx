import React, { useEffect, useState } from "react";
import { faCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link, useOutletContext } from "react-router-dom";
import CopyClipboard from "../../components/CopyClipboard";
import Spinner from "../../components/Spinner";
import { useGoshRoot } from "../../hooks/gosh.hooks";
import { GoshCommit, GoshRepository, GoshSmvClient, GoshSmvLocker, GoshSmvProposal } from "../../types/classes";
import { IGoshCommit, IGoshDao, IGoshRoot, IGoshSmvLocker, IGoshSmvProposal, IGoshWallet } from "../../types/types";
import { classNames, shortString } from "../../utils";
import { TDaoLayoutOutletContext } from "../DaoLayout";


const EventsPage = () => {
    const goshRoot = useGoshRoot();
    const { goshDao, goshWallet } = useOutletContext<TDaoLayoutOutletContext>();
    const [proposals, setProposals] = useState<{ prop: IGoshSmvProposal; commit?: IGoshCommit; locked: number; }[]>();
    const [service, setService] = useState<{ locker?: IGoshSmvLocker; balance?: number; }>();

    useEffect(() => {
        const getPullList = async (root: IGoshRoot, dao: IGoshDao, wallet?: IGoshWallet) => {
            // Get SMVProposal code
            const proposalCode = await dao.getSmvProposalCode();
            const proposalssAddrs = await dao.account.client.net.query_collection({
                collection: 'accounts',
                filter: {
                    code: { eq: proposalCode }
                },
                result: 'id'
            });

            const proposals = await Promise.all(
                (proposalssAddrs?.result || [])
                    .map(async (item: any) => {
                        // Get GoshProposal object
                        const proposal = new GoshSmvProposal(dao.account.client, item.id);
                        await proposal.load();

                        // Get commit
                        let commit = undefined;
                        if (proposal.meta?.commit && dao.meta) {
                            const repoAddr = await root.getRepoAddr(
                                proposal.meta.commit.repoName,
                                dao.meta.name
                            );
                            const repo = new GoshRepository(dao.account.client, repoAddr);
                            const commitAddr = await repo.getCommitAddr(proposal.meta.commit.commitName);
                            commit = new GoshCommit(dao.account.client, commitAddr);
                            await commit.load();
                        };

                        // Get amount of user's locked tokens in proposal
                        let locked = 0;
                        if (proposal.meta && wallet && wallet.isDaoParticipant) {
                            const propLockerAddr = await proposal.getLockerAddr();
                            const smvClientAddr = await wallet.getSmvClientAddr(
                                propLockerAddr,
                                proposal.meta.id
                            );
                            try {
                                const smvClient = new GoshSmvClient(wallet.account.client, smvClientAddr);
                                locked = await smvClient.getLockedAmount();
                            } catch { }
                        }

                        return { prop: proposal, commit, locked };
                    })
            );
            console.debug('[Events] - Proposals:', proposals);
            setProposals(proposals);
        }

        if (goshRoot && goshDao) getPullList(goshRoot, goshDao, goshWallet);
    }, [goshRoot, goshDao, goshWallet]);

    useEffect(() => {
        const initService = async (wallet: IGoshWallet) => {
            const lockerAddr = await wallet.getSmvLockerAddr();
            const locker = new GoshSmvLocker(wallet.account.client, lockerAddr);
            await locker.load();
            const balance = await wallet.getSmvTokenBalance();
            setService({ locker, balance });
        }

        if (goshWallet && goshWallet.isDaoParticipant && !service?.locker) initService(goshWallet);

        let interval: any;
        if (goshWallet && goshWallet.isDaoParticipant && service?.locker) {
            interval = setInterval(async () => {
                await service.locker?.load();
                const balance = await goshWallet.getSmvTokenBalance();
                console.debug('[Events] - Locker busy:', service.locker?.meta?.isBusy);
                setService((prev) => ({ ...prev, balance }));
            }, 5000);
        }

        return () => {
            clearInterval(interval);
        }
    }, [goshWallet, service?.locker]);

    return (
        <div className="bordered-block px-7 py-8">
            <div>
                {goshWallet?.isDaoParticipant && (
                    <div
                        className="relative mb-5 flex px-4 py-3 rounded gap-x-6 bg-gray-100
                        flex-col items-start
                        md:flex-row md:flex-wrap md:items-center"
                    >
                        <div>
                            <span className="font-semibold mr-2">SMV balance:</span>
                            {service?.locker?.meta?.votesTotal}
                        </div>
                        <div>
                            <span className="font-semibold mr-2">Locked:</span>
                            {service?.locker?.meta?.votesLocked}
                        </div>
                        <div>
                            <span className="font-semibold mr-2">Wallet balance:</span>
                            {service?.balance}
                        </div>
                        <div className="grow text-right absolute right-3 top-3 md:relative md:right-auto md:top-auto">
                            <FontAwesomeIcon
                                icon={faCircle}
                                className={classNames(
                                    'ml-2',
                                    service?.locker?.meta?.isBusy ? 'text-rose-600' : 'text-green-900'
                                )}
                            />
                        </div>
                    </div>
                )}

                {proposals === undefined && (
                    <div className="text-gray-606060">
                        <Spinner className="mr-3" />
                        Loading proposals...
                    </div>
                )}
                {proposals && !proposals?.length && (
                    <div className="text-gray-606060 text-center">There are no proposals yet</div>
                )}

                <div className="divide-y divide-gray-c4c4c4">
                    {proposals?.map((item, index) => (
                        <div key={index} className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 py-3">
                            <div className="w-full">
                                <Link
                                    to={`/${goshDao.meta?.name}/events/${item.prop.address}`}
                                    className="text-lg font-semibold hover:underline"
                                >
                                    {item.commit?.meta?.content.title}
                                </Link>
                            </div>
                            <div>
                                <div className="text-gray-606060 text-sm">
                                    <CopyClipboard
                                        label={`${'Proposal: '}${shortString(item.prop.meta?.id || '')}`}
                                        componentProps={{
                                            text: item.prop.meta?.id || ''
                                        }}
                                    />
                                </div>
                                <div className="text-xs text-gray-606060 mt-1">
                                    {item.prop.meta?.time.start.toLocaleString()}
                                    <span className="mx-1">-</span>
                                    {item.prop.meta?.time.finish.toLocaleString()}
                                </div>
                            </div>
                            <div>
                                {item.prop.meta?.commit.repoName}:{item.prop.meta?.commit.branchName}
                                <div className="text-gray-606060 text-sm">
                                    <CopyClipboard
                                        label={`${'Commit: '}${shortString(item.prop.meta?.commit.commitName || '')}`}
                                        componentProps={{
                                            text: item.prop.meta?.commit.commitName || ''
                                        }}
                                    />
                                </div>
                            </div>
                            <div>
                                <span className="mr-3">
                                    {item.prop.meta?.isCompleted
                                        ? <span className="text-green-900">Completed</span>
                                        : 'Running'
                                    }
                                </span>
                                <span className="text-green-900 text-xl">{item.prop.meta?.votes.yes}</span>
                                <span className="mx-1">/</span>
                                <span className="text-rose-600 text-xl">{item.prop.meta?.votes.no}</span>
                            </div>
                            {/* {!!item.locked && item.prop.isCompleted && (
                                <div>
                                    <button
                                        type="button"
                                        className="btn btn--body text-sm px-4 py-1.5"
                                        onClick={() => { }}
                                    >
                                        Release
                                    </button>
                                </div>
                            )} */}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default EventsPage;
