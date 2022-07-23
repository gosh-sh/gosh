import React, { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";

import { useRecoilValue } from "recoil";
import BranchSelect from "../../components/BranchSelect";
import { goshBranchesAtom, goshCurrBranchSelector } from "../../store/gosh.state";
import { IGoshCommit, IGoshDao, IGoshRoot, IGoshSmvLocker, IGoshSmvProposal, IGoshWallet, TGoshBranch } from "../../types/types";
import { TRepoLayoutOutletContext } from "../RepoLayout";
import { useGoshDao, useGoshRoot, useGoshWallet } from "../../hooks/gosh.hooks";
import { classNames, shortString } from "../../utils";
import CopyClipboard from "../../components/CopyClipboard";
import { GoshCommit, GoshRepository, GoshSmvClient, GoshSmvLocker, GoshSmvProposal } from "../../types/classes";
import { EmojiSadIcon } from '@heroicons/react/outline';

import Button from '@mui/material/Button';
import { Modal, Loader, FlexContainer, Flex, Icon } from "./../../components";

import { Typography } from "@mui/material";
import styles from './Pulls.module.scss';
import classnames from "classnames/bind";

const cnb = classnames.bind(styles);

const PullsPage = () => {
    const { daoName, repoName } = useParams();
    const goshRoot = useGoshRoot();
    const goshDao = useGoshDao(daoName);
    const goshWallet = useGoshWallet(daoName);
    const navigate = useNavigate();
    const branches = useRecoilValue(goshBranchesAtom);
    const defaultBranch = useRecoilValue(goshCurrBranchSelector('main'));
    const [branchFrom, setBranchFrom] = useState<TGoshBranch | undefined>(defaultBranch);
    const [branchTo, setBranchTo] = useState<TGoshBranch | undefined>(defaultBranch);
    const [proposals, setProposals] = useState<{ prop: IGoshSmvProposal; commit?: IGoshCommit; locked: number; }[]>();
    const [locker, setLocker] = useState<IGoshSmvLocker>();
    const [balance, setBalance] = useState<number>();

    const getLockerData = async (goshWallet: IGoshWallet) => {
        const lockerAddr = await goshWallet.getSmvLockerAddr();
        console.debug('Locker addr:', lockerAddr)
        const locker = new GoshSmvLocker(goshWallet.account.client, lockerAddr);
        await locker.load();
        console.debug('Locker votes:', locker.meta?.votesLocked, locker.meta?.votesTotal);
        setLocker(locker);
    }

    const getTokenBalance = async (goshWallet: IGoshWallet) => {
        const balance = await goshWallet.getSmvTokenBalance();
        setBalance(balance);
    }

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
                    // if (proposal.meta?.commit && daoName) {
                    //     const repoAddr = await goshRoot.getRepoAddr(
                    //         proposal.meta.commit.repoName,
                    //         daoName
                    //     );
                    //     const goshRepo = new GoshRepository(goshDao.account.client, repoAddr);
                    //     const commitAddr = await goshRepo.getCommitAddr(proposal.meta.commit.commitName);
                    //     commit = new GoshCommit(goshDao.account.client, commitAddr);
                    //     await commit.load();
                    // };

                    // Get amount of user's locked tokens in proposal
                    let locked = 0;
                    // if (proposal.meta) {
                    //     const propLockerAddr = await proposal.getLockerAddr();
                    //     console.log('[propLockerAddr]', propLockerAddr);
                    //     const smvClientAddr = await goshWallet.getSmvClientAddr(
                    //         propLockerAddr,
                    //         proposal.meta.id
                    //     );
                    //     console.log('[svmClientAddr]', smvClientAddr);
                    //     try {
                    //         const smvClient = new GoshSmvClient(goshWallet.account.client, smvClientAddr);
                    //         locked = await smvClient.getLockedAmount();
                    //     } catch { }
                    // }

                    return { prop: proposal, commit, locked };
                })
        );
        console.debug('SMVProposals:', proposals);
        setProposals(proposals);
    }

    useEffect(() => {
        const interval = setInterval(async () => {
            console.log('Reload locker')
            await locker?.load();
        }, 5000);
        return () => {
            clearInterval(interval);
        }
    }, [locker]);

    useEffect(() => {
        if (!repoName && goshRoot && goshDao && goshWallet) getPullList(goshRoot, goshDao, goshWallet);
    }, [repoName, goshRoot, goshDao, goshWallet]);

    useEffect(() => {
        if (goshWallet) {
            getLockerData(goshWallet);
            getTokenBalance(goshWallet);
        }
    }, [goshWallet]);

    return (<>
        <div className="actions">
            
            <FlexContainer
                    direction="row"
                    justify="flex-start"
                    align="center"
                    className={cnb("repository-actions")}
                >
                    <Flex>
                        <BranchSelect
                            branch={branchFrom}
                            branches={branches}
                            onChange={(selected) => {
                                if (selected) {
                                    setBranchFrom(selected);
                                }
                            }}
                        />
                    </Flex>
                    <Flex>
                        <BranchSelect
                            branch={branchTo}
                            branches={branches}
                            onChange={(selected) => {
                                if (selected) {
                                    setBranchTo(selected);
                                }
                            }}
                        />
                    </Flex>
                    <Flex
                        grow={1000}
                    >

                        <Button
                            color="primary"
                            size="small"
                            variant="contained"
                            className={cnb("button-create", "btn-icon")}
                            disableElevation
                            disabled={branchFrom?.name === branchTo?.name}
                            onClick={() => {
                                navigate(`/${daoName}/${repoName}/pull/create?from=${branchFrom?.name}&to=${branchTo?.name}`);
                            }}
                        >
                            Create pull request
                        </Button>
                
                    </Flex>
                </FlexContainer>
                </div>
            <div className={cnb("tree")}>

                        <Typography>Generic only pull requests are available now</Typography>
            </div>
                        {repoName && (
                <>
                    <div className="flex items-center gap-x-4">
                        <BranchSelect
                            branch={branchFrom}
                            branches={branches}
                            onChange={(selected) => {
                                if (selected) {
                                    setBranchFrom(selected);
                                }
                            }}
                            disabled
                        />
                        <span>
                            {/* <FontAwesomeIcon icon={faChevronRight} size="sm" /> */}
                        </span>
                        <BranchSelect
                            branch={branchTo}
                            branches={branches}
                            onChange={(selected) => {
                                if (selected) {
                                    setBranchTo(selected);
                                }
                            }}
                            disabled
                        />
                        <button
                            className="btn btn--body px-3 py-1.5 !font-normal !text-sm"
                            disabled={true || branchFrom?.name === branchTo?.name}
                            onClick={() => {
                                navigate(`/${daoName}/${repoName}/pull/create?from=${branchFrom?.name}&to=${branchTo?.name}`);
                            }}
                        >
                            Create pull request
                        </button>
                    </div>
                    <p className="text-rose-500 text-sm mb-6">
                        Create pull requests are not available in current release.
                        <br />
                        Use local client for this purpose.
                    </p>
                </>
            )}

            {!repoName && (
                <div>
                    <div className="mt-6 mb-5 flex items-center gap-x-6 bg-gray-100 rounded px-4 py-3">
                        <div>
                            <span className="font-semibold mr-2">SMV balance:</span>
                            {locker?.meta?.votesTotal}
                        </div>
                        <div>
                            <span className="font-semibold mr-2">Locked:</span>
                            {locker?.meta?.votesLocked}
                        </div>
                        <div>
                            <span className="font-semibold mr-2">Wallet balance:</span>
                            {balance}
                        </div>
                        <div className="grow text-right">

                        </div>
                    </div>

                    {proposals === undefined && (
                        <div className="loader">
                            <Loader />
                            Loading {"proposals"}...
                        </div>
                    )}
                    {proposals && !proposals?.length && (
                         <div className="no-data"><EmojiSadIcon/>There are no repositories</div>
                    )}

                    <div className="divide-y divide-gray-c4c4c4">
                        {proposals?.map((item, index) => (
                            <div key={index} className="flex items-center gap-x-5 py-3">
                                <div className="basis-2/5">
                                    <Link
                                        to={`/${daoName}/events/${item.prop.address}`}
                                        className="text-lg font-semibold hover:underline"
                                    >
                                        {item.commit?.meta?.content.title}
                                    </Link>
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
                                <div className="grow">
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
                                    {item.prop.meta?.isCompleted
                                        ? <span className="text-green-900">Completed</span>
                                        : (<><Loader /> Running</>)
                                    }
                                </div>
                                <div>
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
            )}

        </>
    );
}

export default PullsPage;
