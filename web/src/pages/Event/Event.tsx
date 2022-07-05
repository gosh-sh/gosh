import React, { useEffect, useState } from 'react';
import { Field, Form, Formik } from 'formik';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import TextField from '../../components/FormikForms/TextField';
import Spinner from '../../components/Spinner';
import {
    GoshCommit,
    GoshRepository,
    GoshSmvClient,
    GoshSmvLocker,
    GoshSmvProposal,
} from '../../types/classes';
import {
    IGoshCommit,
    IGoshRepository,
    IGoshRoot,
    IGoshSmvLocker,
    IGoshSmvProposal,
    IGoshWallet,
} from '../../types/types';
import * as Yup from 'yup';
import CopyClipboard from '../../components/CopyClipboard';
import { classNames, shortString } from '../../utils';
import { useGoshRoot } from '../../hooks/gosh.hooks';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircle } from '@fortawesome/free-solid-svg-icons';
import { TDaoLayoutOutletContext } from '../DaoLayout';
import { EGoshError, GoshError } from '../../types/errors';
import { toast } from 'react-toastify';
import CommitBlobs from '../Commit/CommitBlobs';

type TFormValues = {
    approve: string;
    amount: number;
};

const EventPage = () => {
    const { daoName, eventAddr } = useParams();
    const { goshDao, goshWallet } = useOutletContext<TDaoLayoutOutletContext>();
    const goshRoot = useGoshRoot();
    const [release, setRelease] = useState<boolean>(false);
    const [check, setCheck] = useState<boolean>(false);
    const [service, setService] = useState<{
        proposal?: IGoshSmvProposal;
        proposalLocked: number;
        locker?: IGoshSmvLocker;
        balance: number;
        repo?: IGoshRepository;
        commit?: IGoshCommit;
    }>();

    const getCommit = async (
        repo: IGoshRepository,
        name: string
    ): Promise<IGoshCommit> => {
        // Get commit data
        const address = await repo.getCommitAddr(name);
        const commit = new GoshCommit(repo.account.client, address);
        await commit.load();
        return commit;
    };

    const onProposalCheck = async (
        proposal: IGoshSmvProposal,
        wallet: IGoshWallet
    ) => {
        try {
            if (service?.locker?.meta?.isBusy)
                throw new GoshError(EGoshError.SMV_LOCKER_BUSY);
            setCheck(true);
            await wallet.tryProposalResult(proposal.address);
            toast.success(
                'Re-check submitted. Please, wait a bit for data to be updated or check status later'
            );
        } catch (e: any) {
            console.error(e.message);
            toast.error(e.message);
        } finally {
            setCheck(false);
        }
    };

    const onProposalSubmit = async (values: TFormValues) => {
        try {
            if (!goshRoot) throw new GoshError(EGoshError.NO_ROOT);
            if (!goshDao) throw new GoshError(EGoshError.NO_DAO);
            if (!goshWallet) throw new GoshError(EGoshError.NO_WALLET);
            if (!service?.proposal)
                throw new GoshError(EGoshError.SMV_NO_PROPOSAL);

            if (
                service.proposal.meta?.time.start &&
                Date.now() < service.proposal.meta?.time.start.getTime()
            ) {
                throw new GoshError(EGoshError.SMV_NO_START, {
                    start: service.proposal.meta?.time.start.getTime(),
                });
            }
            if (service.locker?.meta?.isBusy)
                throw new GoshError(EGoshError.SMV_LOCKER_BUSY);

            const smvPlatformCode = await goshRoot.getSmvPlatformCode();
            const smvClientCode = await goshDao.getSmvClientCode();
            const choice = values.approve === 'true';
            await goshWallet.voteFor(
                smvPlatformCode,
                smvClientCode,
                service.proposal.address,
                choice,
                values.amount
            );
            toast.success(
                'Vote accepted. Please, wait a bit for data to be updated or check status later'
            );
        } catch (e: any) {
            console.error(e.message);
            toast.error(e.message);
        }
    };

    const onTokensRelease = async () => {
        try {
            if (!goshWallet) throw new GoshError(EGoshError.NO_WALLET);
            if (!service?.proposal)
                throw new GoshError(EGoshError.SMV_NO_PROPOSAL);

            setRelease(true);
            await goshWallet.updateHead();
        } catch (e: any) {
            console.error(e.message);
            toast.error(e.message);
        } finally {
            setRelease(false);
        }
    };

    useEffect(() => {
        const getGoshPull = async (
            root: IGoshRoot,
            eventAddr: string,
            wallet?: IGoshWallet
        ) => {
            // Get GoshProposal object
            const prop = new GoshSmvProposal(root.account.client, eventAddr);
            await prop.load();
            if (!prop.meta || !daoName || !goshRoot) {
                toast.error('Error loading proposal');
                return;
            }

            // Get repository and commit with blobs
            const repoAddr = await root.getRepoAddr(
                prop.meta.commit.repoName,
                daoName
            );
            const repo = new GoshRepository(root.account.client, repoAddr);
            const commit = await getCommit(repo, prop.meta.commit.commitName);

            // Get SMVLocker
            let locker: IGoshSmvLocker | undefined;
            let balance = 0;
            if (wallet?.isDaoParticipant) {
                const lockerAddr = await wallet.getSmvLockerAddr();
                locker = new GoshSmvLocker(wallet.account.client, lockerAddr);
                await locker.load();
                balance = await wallet.getSmvTokenBalance();
            }

            setService({
                proposal: prop,
                proposalLocked: 0,
                locker,
                balance,
                repo,
                commit,
            });
        };

        if (goshRoot && eventAddr && !service?.locker && !service?.proposal) {
            getGoshPull(goshRoot, eventAddr, goshWallet);
        }
        let interval: any;
        if (goshWallet && service?.locker && service?.proposal) {
            interval = setInterval(async () => {
                await service.locker?.load();
                await service.proposal?.load();
                const balance = await goshWallet.getSmvTokenBalance();

                let proposalLocked = 0;
                try {
                    if (service.locker && service.proposal?.meta) {
                        const smvClientAddr = await goshWallet.getSmvClientAddr(
                            service.locker.address,
                            service.proposal.meta.id
                        );
                        const client = new GoshSmvClient(
                            goshWallet.account.client,
                            smvClientAddr
                        );
                        proposalLocked = await client.getLockedAmount();
                    }
                } catch {}

                console.debug('[Locker] - Busy:', service.locker?.meta?.isBusy);
                setService((prev) => ({ ...prev, balance, proposalLocked }));
            }, 5000);
        }

        return () => {
            clearInterval(interval);
        };
    }, [
        eventAddr,
        goshWallet,
        daoName,
        goshRoot,
        service?.locker,
        service?.proposal,
    ]);

    return (
        <div className="bordered-block px-7 py-8">
            {!service?.proposal && (
                <div className="text-gray-606060">
                    <Spinner className="mr-3" />
                    Loading proposal...
                </div>
            )}

            {service?.proposal && service.repo && service.commit && (
                <div>
                    {goshWallet?.isDaoParticipant && (
                        <div
                            className="relative mb-5 flex px-4 py-3 rounded gap-x-6 bg-gray-100
                            flex-col items-start
                            md:flex-row md:flex-wrap md:items-center"
                        >
                            <div>
                                <span className="font-semibold mr-2">
                                    SMV balance:
                                </span>
                                {service.locker?.meta?.votesTotal}
                            </div>
                            <div>
                                <span className="font-semibold mr-2">
                                    Locked:
                                </span>
                                {service.locker?.meta?.votesLocked}
                            </div>
                            <div>
                                <span className="font-semibold mr-2">
                                    Wallet balance:
                                </span>
                                {service.balance}
                            </div>
                            <div className="grow text-right absolute right-3 top-3 md:relative md:right-auto md:top-auto">
                                <FontAwesomeIcon
                                    icon={faCircle}
                                    className={classNames(
                                        'ml-2',
                                        service.locker?.meta?.isBusy
                                            ? 'text-rose-600'
                                            : 'text-green-900'
                                    )}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 py-2">
                        <h3 className="basis-full text-xl font-semibold">
                            {service.commit?.meta?.content.title}
                        </h3>
                        <div>
                            <div className="text-gray-606060 text-sm">
                                <CopyClipboard
                                    label={`${'Proposal: '}${shortString(
                                        service.proposal.meta?.id || ''
                                    )}`}
                                    componentProps={{
                                        text: service.proposal.meta?.id || '',
                                    }}
                                />
                            </div>
                            <div className="text-xs text-gray-606060 mt-1">
                                {service.proposal.meta?.time.start.toLocaleString()}
                                <span className="mx-1">-</span>
                                {service.proposal.meta?.time.finish.toLocaleString()}
                            </div>
                        </div>
                        <div>
                            {service.proposal.meta?.commit.repoName}:
                            {service.proposal.meta?.commit.branchName}
                            <div className="text-gray-606060 text-sm">
                                <CopyClipboard
                                    label={`${'Commit: '}${shortString(
                                        service.proposal.meta?.commit
                                            .commitName || ''
                                    )}`}
                                    componentProps={{
                                        text:
                                            service.proposal.meta?.commit
                                                .commitName || '',
                                    }}
                                />
                            </div>
                        </div>
                        <div>
                            <span className="mr-3">
                                {service.proposal.meta?.isCompleted ? (
                                    <span className="text-green-900">
                                        Completed
                                    </span>
                                ) : (
                                    'Running'
                                )}
                            </span>
                            <div>
                                <span className="text-green-900 text-xs">
                                    Accepted
                                    <span className="text-xl ml-2">
                                        {service.proposal.meta?.votes.yes}
                                    </span>
                                </span>
                                <span className="mx-1">/</span>
                                <span className="text-rose-600 text-xs">
                                    <span className="text-xl mr-2">
                                        {service.proposal.meta?.votes.no}
                                    </span>
                                    Rejected
                                </span>
                            </div>
                        </div>
                        {goshWallet &&
                            goshWallet.isDaoParticipant &&
                            !!service.proposalLocked &&
                            service.proposal.meta?.isCompleted && (
                                <div>
                                    <button
                                        type="button"
                                        className="btn btn--body text-sm px-4 py-1.5"
                                        onClick={onTokensRelease}
                                        disabled={
                                            release ||
                                            service.locker?.meta?.isBusy
                                        }
                                    >
                                        {release && (
                                            <Spinner className="mr-2" />
                                        )}
                                        Release
                                    </button>
                                </div>
                            )}
                        {goshWallet &&
                            goshWallet.isDaoParticipant &&
                            !service.proposal.meta?.isCompleted && (
                                <div>
                                    <button
                                        type="button"
                                        className="btn btn--body text-sm px-4 py-1.5"
                                        onClick={() =>
                                            service.proposal &&
                                            onProposalCheck(
                                                service.proposal,
                                                goshWallet
                                            )
                                        }
                                        disabled={
                                            check ||
                                            service.locker?.meta?.isBusy
                                        }
                                    >
                                        {check && <Spinner className="mr-2" />}
                                        Re-check
                                    </button>
                                </div>
                            )}
                    </div>

                    {service.proposal.meta?.isCompleted && (
                        <div className="text-green-700 mt-6">
                            Commit proposal
                            <Link
                                className="mx-1 underline text-green-900"
                                to={`/${daoName}/${service.proposal.meta.commit.repoName}/commits/${service.proposal.meta.commit.branchName}/${service.proposal.meta.commit.commitName}`}
                            >
                                {shortString(
                                    service.proposal.meta.commit.commitName
                                )}
                            </Link>
                            was accepted by SMV
                        </div>
                    )}

                    {goshWallet?.isDaoParticipant &&
                        !service.proposal.meta?.isCompleted && (
                            <Formik
                                initialValues={{
                                    approve: 'true',
                                    amount:
                                        (service.locker?.meta?.votesTotal ??
                                            0) -
                                        (service.locker?.meta?.votesLocked ??
                                            0),
                                }}
                                onSubmit={onProposalSubmit}
                                validationSchema={Yup.object().shape({
                                    amount: Yup.number()
                                        .min(1, 'Should be a number >= 1')
                                        .max(
                                            (service.locker?.meta?.votesTotal ??
                                                0) -
                                                (service.locker?.meta
                                                    ?.votesLocked ?? 0)
                                        )
                                        .required('Field is required'),
                                })}
                                enableReinitialize
                            >
                                {({ isSubmitting }) => (
                                    <div className="mt-10">
                                        <h3 className="text-xl font-semibold">
                                            Vote for proposal
                                        </h3>
                                        <Form className="flex flex-wrap items-baseline my-4 gap-x-6 gap-y-3">
                                            <div className="grow sm:grow-0">
                                                <Field
                                                    name="amount"
                                                    component={TextField}
                                                    inputProps={{
                                                        className: '!py-1.5',
                                                        placeholder:
                                                            'Amount of tokens',
                                                        autoComplete: 'off',
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="mr-3">
                                                    <Field
                                                        type="radio"
                                                        name="approve"
                                                        value={'true'}
                                                    />
                                                    <span className="ml-1">
                                                        Accept
                                                    </span>
                                                </label>
                                                <label>
                                                    <Field
                                                        type="radio"
                                                        name="approve"
                                                        value={'false'}
                                                    />
                                                    <span className="ml-1">
                                                        Reject
                                                    </span>
                                                </label>
                                            </div>
                                            <button
                                                className="btn btn--body font-medium px-4 py-1.5 w-full sm:w-auto"
                                                type="submit"
                                                disabled={
                                                    isSubmitting ||
                                                    service.locker?.meta?.isBusy
                                                }
                                            >
                                                {isSubmitting && (
                                                    <Spinner className="mr-2" />
                                                )}
                                                Vote for proposal
                                            </button>
                                        </Form>
                                    </div>
                                )}
                            </Formik>
                        )}

                    <h3 className="mt-10 mb-4 text-xl font-semibold">
                        Proposal diff
                    </h3>
                    {service.commit.meta && (
                        <CommitBlobs
                            repo={service.repo}
                            commit={service.commit.meta.sha}
                            branch={service.commit.meta.branchName}
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default EventPage;
