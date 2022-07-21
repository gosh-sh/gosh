import { useEffect, useState } from 'react';
import { Field, Form, Formik } from 'formik';
import { useOutletContext, useParams } from 'react-router-dom';
import TextField from '../../components/FormikForms/TextField';
import Spinner from '../../components/Spinner';
import { GoshSmvProposal } from 'web-common/lib/types/classes';
import { EEventType, TGoshEventDetails } from 'web-common/lib/types/types';
import * as Yup from 'yup';
import CopyClipboard from '../../components/CopyClipboard';
import { shortString } from 'web-common/lib/utils';
import { useGoshRoot, useSmvBalance } from 'web-common/lib/hooks/gosh.hooks';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDays, faHashtag } from '@fortawesome/free-solid-svg-icons';
import { TDaoLayoutOutletContext } from '../DaoLayout';
import PREvent from './PREvent';
import SmvBalance from '../../components/SmvBalance/SmvBalance';
import { eventTypes, goshClient } from 'web-common/lib/helpers';
import { EGoshError, GoshError } from 'web-common/lib/types/errors';
import { toast } from 'react-toastify';

type TFormValues = {
    approve: string;
    amount: number;
};

const EventPage = () => {
    const { daoName, eventAddr } = useParams();
    const { dao, wallet } = useOutletContext<TDaoLayoutOutletContext>();
    const root = useGoshRoot();
    const smvBalance = useSmvBalance(wallet);
    const [check, setCheck] = useState<boolean>(false);
    const [event, setEvent] = useState<{
        details?: TGoshEventDetails;
        isFetching: boolean;
    }>({
        isFetching: true,
    });

    /** Send check trigger to event */
    const onProposalCheck = async () => {
        try {
            if (!wallet) throw new GoshError(EGoshError.NO_WALLET);
            if (!event.details) throw new GoshError(EGoshError.SMV_NO_PROPOSAL);
            if (smvBalance.smvBusy) throw new GoshError(EGoshError.SMV_LOCKER_BUSY);
            setCheck(true);
            await wallet.tryProposalResult(event.details.address);
            toast.success('Re-check submitted, event details will be updated soon');
        } catch (e: any) {
            console.error(e.message);
            toast.error(e.message);
        } finally {
            setCheck(false);
        }
    };

    /** Submit vote */
    const onProposalSubmit = async (values: TFormValues) => {
        try {
            if (!root) throw new GoshError(EGoshError.NO_ROOT);
            if (!dao) throw new GoshError(EGoshError.NO_DAO);
            if (!wallet) throw new GoshError(EGoshError.NO_WALLET);
            if (!event.details) throw new GoshError(EGoshError.SMV_NO_PROPOSAL);
            if (
                event.details.time.start &&
                Date.now() < event.details.time.start.getTime()
            ) {
                throw new GoshError(EGoshError.SMV_NO_START, {
                    start: event.details.time.start.getTime(),
                });
            }
            if (smvBalance.smvBusy) throw new GoshError(EGoshError.SMV_LOCKER_BUSY);
            const smvPlatformCode = await root.getSmvPlatformCode();
            const smvClientCode = await dao.getSmvClientCode();
            const choice = values.approve === 'true';
            await wallet.voteFor(
                smvPlatformCode,
                smvClientCode,
                event.details.address,
                choice,
                values.amount
            );
            toast.success('Vote accepted, event details will be updated soon');
        } catch (e: any) {
            console.error(e.message);
            toast.error(e.message);
        }
    };

    useEffect(() => {
        const getEvent = async () => {
            if (!eventAddr) return;

            const event = new GoshSmvProposal(goshClient, eventAddr);
            const details = await event.getDetails();
            setEvent((state) => ({ ...state, details, isFetching: false }));
        };

        setEvent({ details: undefined, isFetching: true });
        getEvent();

        const interval = setInterval(async () => {
            console.debug('Event details reload');
            await getEvent();
        }, 10000);

        return () => {
            clearInterval(interval);
        };
    }, [eventAddr]);

    return (
        <div className="bordered-block px-7 py-8">
            <SmvBalance
                details={smvBalance}
                wallet={wallet}
                className="mb-5 bg-gray-100"
            />

            {event.isFetching && (
                <div className="text-gray-606060">
                    <Spinner className="mr-3" />
                    Loading proposal...
                </div>
            )}

            {!event.isFetching && event.details && (
                <div>
                    <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 py-2">
                        <div>
                            <h3 className="basis-full text-xl font-semibold mb-2">
                                {eventTypes[event.details.params.proposalKind]}
                            </h3>
                            <CopyClipboard
                                className="text-gray-606060 text-sm"
                                label={
                                    <>
                                        <FontAwesomeIcon
                                            icon={faHashtag}
                                            size="sm"
                                            className="mr-2"
                                        />
                                        {shortString(event.details.id || '')}
                                    </>
                                }
                                componentProps={{
                                    text: event.details.id || '',
                                }}
                            />
                        </div>
                        <div>
                            <FontAwesomeIcon icon={faCalendarDays} className="mr-2" />
                            {event.details.time.start.toLocaleString()}
                            <span className="mx-1">-</span>
                            {event.details.time.finish.toLocaleString()}
                        </div>
                        <div>
                            <span className="mr-3">
                                {!event.details.status.completed ? (
                                    <>
                                        <Spinner size="sm" className="mr-2" />
                                        Running
                                    </>
                                ) : event.details.status.accepted ? (
                                    <span className="text-green-900">Accepted</span>
                                ) : (
                                    <span className="text-rose-600">Rejected</span>
                                )}
                            </span>
                            <div>
                                <span className="text-green-900 text-xs">
                                    Accepted
                                    <span className="text-xl ml-2">
                                        {event.details.votes.yes}
                                    </span>
                                </span>
                                <span className="mx-1">/</span>
                                <span className="text-rose-600 text-xs">
                                    <span className="text-xl mr-2">
                                        {event.details.votes.no}
                                    </span>
                                    Rejected
                                </span>
                            </div>
                        </div>
                        {wallet?.isDaoParticipant && !event.details.status.completed && (
                            <div>
                                <button
                                    type="button"
                                    className="btn btn--body text-sm px-4 py-1.5"
                                    onClick={onProposalCheck}
                                    disabled={check || smvBalance.smvBusy}
                                >
                                    {check && <Spinner className="mr-2" />}
                                    Re-check
                                </button>
                            </div>
                        )}
                    </div>

                    {wallet?.isDaoParticipant && !event.details?.status.completed && (
                        <Formik
                            initialValues={{
                                approve: 'true',
                                amount: smvBalance.smvBalance - smvBalance.smvLocked,
                            }}
                            onSubmit={onProposalSubmit}
                            validationSchema={Yup.object().shape({
                                amount: Yup.number()
                                    .min(1, 'Should be a number >= 1')
                                    .max(smvBalance.smvBalance - smvBalance.smvLocked)
                                    .required('Field is required'),
                            })}
                            enableReinitialize
                        >
                            {({ isSubmitting }) => (
                                <div className="mt-10">
                                    <h4 className="text-lg font-semibold">
                                        Vote for proposal
                                    </h4>
                                    <Form className="flex flex-wrap items-baseline my-4 gap-x-6 gap-y-3">
                                        <div className="grow sm:grow-0">
                                            <Field
                                                name="amount"
                                                component={TextField}
                                                inputProps={{
                                                    className: '!py-1.5',
                                                    placeholder: 'Amount of tokens',
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
                                                <span className="ml-1">Accept</span>
                                            </label>
                                            <label>
                                                <Field
                                                    type="radio"
                                                    name="approve"
                                                    value={'false'}
                                                />
                                                <span className="ml-1">Reject</span>
                                            </label>
                                        </div>
                                        <button
                                            className="btn btn--body font-medium px-4 py-1.5 w-full sm:w-auto"
                                            type="submit"
                                            disabled={isSubmitting || smvBalance.smvBusy}
                                        >
                                            {isSubmitting && <Spinner className="mr-2" />}
                                            Vote for proposal
                                        </button>
                                    </Form>
                                </div>
                            )}
                        </Formik>
                    )}

                    {event.details.status.completed && !event.details.status.accepted && (
                        <div className="bg-rose-600 text-white mt-6 px-4 py-3 rounded">
                            Proposal was rejected by SMV
                        </div>
                    )}
                </div>
            )}

            {event.details?.params.proposalKind === EEventType.PR && (
                <PREvent
                    daoName={daoName}
                    repoName={event.details.params.repoName}
                    commitName={event.details.params.commit}
                    branchName={event.details.params.branchName}
                    status={event.details.status}
                />
            )}
        </div>
    );
};

export default EventPage;
