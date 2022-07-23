import React, { useEffect, useState } from "react";
import { Field, Form, Formik } from "formik";
import { Link, useParams } from "react-router-dom";
import { Loader } from "../../components";
import { GoshBlob, GoshCommit, GoshRepository, GoshSmvClient, GoshSmvLocker, GoshSmvProposal } from "../../types/classes";
import { IGoshBlob, IGoshCommit, IGoshRepository, IGoshSmvLocker, IGoshSmvProposal, IGoshWallet } from "../../types/types";
import * as Yup from "yup";
import CopyClipboard from "../../components/CopyClipboard";
import { classNames, shortString } from "../../utils";
import InputBase from '@mui/material/InputBase';
import { getCodeLanguageFromFilename, getCommitTree } from "../../utils";
import BlobDiffPreview from "../../components/Blob/DiffPreview";
import { useGoshDao, useGoshRepoBranches, useGoshRoot, useGoshWallet } from "../../hooks/gosh.hooks";
import { useMonaco } from "@monaco-editor/react";


type TFormValues = {
    approve: string;
    amount: number;
}

const PullPage = () => {
    const { daoName, pullAddress } = useParams();
    const goshRoot = useGoshRoot();
    const goshDao = useGoshDao(daoName);
    const goshWallet = useGoshWallet(daoName);
    const [prop, setProp] = useState<{ prop: IGoshSmvProposal; locked: number; }>();
    const [commit, setCommit] = useState<{
        commit: IGoshCommit;
        blobs: { name: '', curr: IGoshBlob, prev?: IGoshBlob }[];
    }>();
    const monaco = useMonaco();
    const [locker, setLocker] = useState<IGoshSmvLocker>();
    const [balance, setBalance] = useState<number>();
    const [goshRepo, setGoshRepo] = useState<IGoshRepository>();
    const { updateBranch } = useGoshRepoBranches(goshRepo);
    const [release, setRelease] = useState<boolean>(false);

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

    const getCommit = async (repo: IGoshRepository, name: string): Promise<[IGoshCommit, any[]]> => {
        // Get commit data
        const address = await repo.getCommitAddr(name);
        const commit = new GoshCommit(repo.account.client, address);
        await commit.load();

        // Get commit blobs
        const blobAddrs = await commit.getBlobs();
        const blobTrees: IGoshBlob[] = [];
        const blobs: { name: string; curr: IGoshBlob; prev?: IGoshBlob; }[] = [];
        await Promise.all(
            blobAddrs.map(async (addr) => {
                // Create blob and load it's data
                const blob = new GoshBlob(repo.account.client, addr);
                await blob.load();
                if (!blob.meta) throw Error('Can not load blob meta');

                // Extract tree blob from common blobs
                if (blob.meta.name.indexOf('tree ') >= 0) blobTrees.push(blob);
                else {
                    // If blob has prevSha, load this prev blob
                    let prevBlob = undefined;
                    if (blob.meta?.prevSha) {
                        const prevBlobAddr = await repo.getBlobAddr(`blob ${blob.meta.prevSha}`);
                        prevBlob = new GoshBlob(repo.account.client, prevBlobAddr);
                        await prevBlob.load();
                    }
                    blobs.push({ name: '', curr: blob, prev: prevBlob });
                }
            })
        );
        console.debug('Trees blobs', blobTrees);
        console.debug('Common blobs', blobs);

        // Construct commit tree
        const filesList = blobTrees
            .map((blob) => blob.meta?.content || '')
            .reduce((a: string[], content) => [...a, ...content.split('\n')], []);
        console.debug('Files list', filesList);
        const commitTree = getCommitTree(filesList);
        console.debug('Commit tree', commitTree);

        // Update blobs names (path) from tree
        Object.values(commitTree).forEach((items) => {
            items.forEach((item) => {
                const found = blobs.find((bItem) => (
                    bItem.curr.meta?.name === `${item.type} ${item.sha}`
                ));
                if (found) found.name = item.name;
            })
        });
        console.debug('Ready to render blobs', blobs);

        return [commit, blobs];
    }

    const _setProp = async (prop: IGoshSmvProposal, goshWallet: IGoshWallet) => {
        let locked = 0;
        if (prop.meta) {
            const propLockerAddr = await prop.getLockerAddr();
            console.log('[propLockerAddr]', propLockerAddr);
            const smvClientAddr = await goshWallet.getSmvClientAddr(
                propLockerAddr,
                prop.meta.id
            );
            console.log('[svmClientAddr]', smvClientAddr);
            try {
                const smvClient = new GoshSmvClient(goshWallet.account.client, smvClientAddr);
                locked = await smvClient.getLockedAmount();
            } catch { }
        }
        setProp({ prop, locked });
    }

    const onProposalCheck = async (goshProposal: IGoshSmvProposal, goshWallet: IGoshWallet) => {
        try {
            await goshWallet.tryProposalResult(goshProposal.address);
            await locker?.load();
            await goshProposal.load();
            if (goshProposal.meta?.commit.branchName) {
                console.log('Update branch', goshProposal.meta?.commit.branchName)
                await updateBranch(goshProposal.meta?.commit.branchName);
            }
            await getTokenBalance(goshWallet);
            await _setProp(goshProposal, goshWallet);
        } catch (e: any) {
            console.error(e.message)
        }
    }

    const onProposalSubmit = async (values: TFormValues) => {
        try {
            if (!goshRoot) throw Error('GoshRoot is undefined');
            if (!goshDao) throw Error('GoshDao is undefined');
            if (!goshWallet) throw Error('GoshWallet is undefined');
            if (!prop) throw Error('Proposal is undefined');

            if (prop.prop.meta?.time.start && Date.now() < prop.prop.meta?.time.start.getTime()) {
                throw Error('It\'s too early to vote.\nPlease, wait for the voting time');
            }
            if (locker?.meta?.isBusy) throw Error('Locker is busy');

            console.log('VALUES', values);
            const smvPlatformCode = await goshRoot.getSmvPlatformCode();
            // console.debug('SMV platform code', smvPlatformCode);
            const smvClientCode = await goshDao.getSmvClientCode();
            // console.debug('SMV client code', smvClientCode);
            const choice = values.approve === 'true';
            console.debug('SMV choice', choice);
            await goshWallet.voteFor(
                smvPlatformCode,
                smvClientCode,
                prop.prop.address,
                choice,
                values.amount
            );

            await onProposalCheck(prop.prop, goshWallet);
        } catch (e: any) {
            console.error(e.message);
            alert(e.message);
        }
    }

    const onTokensRelease = async () => {
        try {
            if (!prop) throw Error('Proposal is undefined');
            if (!goshWallet) throw Error('GoshWallet is undefined');

            setRelease(true);
            await goshWallet.updateHead();
            await locker?.load();
            await _setProp(prop.prop, goshWallet);
        } catch (e: any) {
            console.error(e.message);
            alert(e.message);
        } finally {
            setRelease(false);
        }
    }

    useEffect(() => {
        const getGoshPull = async (goshWallet: IGoshWallet, address: string) => {
            // Get GoshProposal object
            const prop = new GoshSmvProposal(goshWallet.account.client, address);
            await prop.load();
            if (!prop.meta?.commit || !daoName || !goshRoot) {
                alert('Error loading proposal');
                return;
            }

            const repoAddr = await goshRoot.getRepoAddr(
                prop.meta.commit.repoName,
                daoName
            );
            const goshRepo = new GoshRepository(goshRoot.account.client, repoAddr);
            const [commit, blobs] = await getCommit(goshRepo, prop.meta.commit.commitName);
            await _setProp(prop, goshWallet);
            setCommit({ commit, blobs });
            setGoshRepo(goshRepo);
        }

        if (goshWallet && pullAddress) getGoshPull(goshWallet, pullAddress);
    }, [pullAddress, goshWallet]);

    useEffect(() => {
        if (goshWallet) {
            getLockerData(goshWallet);
            getTokenBalance(goshWallet);
        }
    }, [goshWallet]);

    useEffect(() => {
        const interval = setInterval(async () => {
            console.log('Reload locker')
            await locker?.load();
        }, 5000);
        return () => {
            clearInterval(interval);
        }
    }, [locker]);

    return (
        <div className="bordered-block px-7 py-8">
            {prop === undefined && (
                <div className="loader">
                    <Loader />
                    Loading proposal...
                </div>
            )}

            {prop && monaco && (
                <div>
                    <div className="mb-5 flex items-center gap-x-6 bg-gray-100 rounded px-4 py-3">
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
                    </div>

                    <div className="flex items-center gap-x-5 py-2">
                        <div className="basis-2/5">
                            <h3 className="text-xl font-semibold">
                                {commit?.commit.meta?.content.title}
                            </h3>

                            <div className="text-gray-606060 text-sm">
                                <CopyClipboard
                                    label={`${'Proposal: '}${shortString(prop.prop.meta?.id || '')}`}
                                    componentProps={{
                                        text: prop.prop.meta?.id || ''
                                    }}
                                />
                            </div>
                            <div className="text-xs text-gray-606060 mt-1">
                                {prop.prop.meta?.time.start.toLocaleString()}
                                <span className="mx-1">-</span>
                                {prop.prop.meta?.time.finish.toLocaleString()}
                            </div>
                        </div>
                        <div className="grow">
                            {prop.prop.meta?.commit.repoName}:{prop.prop.meta?.commit.branchName}
                            <div className="text-gray-606060 text-sm">
                                <CopyClipboard
                                    label={`${'Commit: '}${shortString(prop.prop.meta?.commit.commitName || '')}`}
                                    componentProps={{
                                        text: prop.prop.meta?.commit.commitName || ''
                                    }}
                                />
                            </div>
                        </div>
                        <div>
                            {prop.prop.meta?.isCompleted
                                ? <span className="text-green-900">Completed</span>
                                : (<><Loader/> Running</>)
                            }
                        </div>
                        <div>
                            <span className="text-green-900 text-xl">{prop.prop.meta?.votes.yes}</span>
                            <span className="mx-1">/</span>
                            <span className="text-rose-600 text-xl">{prop.prop.meta?.votes.no}</span>
                        </div>
                        {!!prop.locked && prop.prop.meta?.isCompleted && (
                            <div>
                                <button
                                    type="button"
                                    className="btn btn--body text-sm px-4 py-1.5"
                                    onClick={onTokensRelease}
                                    disabled={release}
                                >
                                    {release && <Loader />}
                                    Release
                                </button>
                            </div>
                        )}
                    </div>

                    {prop.prop.meta?.isCompleted && (
                        <div className="text-green-700 mt-6">
                            Commit proposal
                            <Link
                                className="mx-1 underline text-green-900"
                                to={`/${daoName}/${prop.prop.meta.commit.repoName}/commits/${prop.prop.meta.commit.branchName}/${prop.prop.meta.commit.commitName}`}
                            >
                                {shortString(prop.prop.meta.commit.commitName)}
                            </Link>
                            was accepted by SMV
                        </div>
                    )}

                    {!prop.prop.meta?.isCompleted && (
                        <Formik
                            initialValues={{ approve: 'true', amount: 51 }}
                            onSubmit={onProposalSubmit}
                            validationSchema={Yup.object().shape({
                                amount: Yup.number().min(20, 'Should be a number >= 20').required('Field is required')
                            })}
                        >
                            {({ isSubmitting }) => (
                                <div className="mt-10">
                                    <h3 className="text-xl font-semibold">Vote for proposal</h3>
                                    <Form className="flex items-baseline my-4 gap-x-6">
                                        <div>
                                            <Field
                                                name="amount"
                                                component={InputBase}
                                                inputProps={{
                                                    className: '!py-1.5',
                                                    placeholder: 'Amount of tokens'
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="mr-3">
                                                <Field type="radio" name="approve" value={'true'} />
                                                <span className="ml-1">Accept</span>
                                            </label>
                                            <label>
                                                <Field type="radio" name="approve" value={'false'} />
                                                <span className="ml-1">Reject</span>
                                            </label>
                                        </div>
                                        <button
                                            className="btn btn--body font-medium px-4 py-1.5"
                                            type="submit"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting && <Loader />}
                                            Vote for proposal
                                        </button>
                                    </Form>
                                </div>
                            )}
                        </Formik>
                    )}

                    <h3 className="mt-10 mb-4 text-xl font-semibold">Proposal diff</h3>
                    {commit?.blobs?.map((item, index) => {
                        const language = getCodeLanguageFromFilename(monaco, item.name);
                        return (
                            <div key={index} className="my-5 border rounded overflow-hidden">
                                <div className="bg-gray-100 border-b px-3 py-1.5 text-sm font-semibold">
                                    {item.name}
                                </div>
                                <BlobDiffPreview
                                    original={item.prev?.meta?.content}
                                    modified={item.curr.meta?.content}
                                    modifiedLanguage={language}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default PullPage;
