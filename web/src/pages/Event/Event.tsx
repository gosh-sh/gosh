import { Field, Form, Formik } from 'formik'
import { useOutletContext, useParams } from 'react-router-dom'
import { TextField } from '../../components/Formik'
import Spinner from '../../components/Spinner'
import { ESmvEventType, useSmv, useSmvEvent, useSmvVote } from 'react-gosh'
import * as Yup from 'yup'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarDays } from '@fortawesome/free-solid-svg-icons'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import PREvent from './PREvent'
import SmvBalance from '../../components/SmvBalance/SmvBalance'
import { toast } from 'react-toastify'
import BranchEvent from './BranchEvent'
import MemberEvent from './MemberEvent'
import DaoUpgradeEvent from './DaoUpgradeEvent'
import ToastError from '../../components/Error/ToastError'
import TaskConfirmEvent from './TaskConfirmEvent'
import TaskDeleteEvent from './TaskDeleteEvent'

type TFormValues = {
    approve: string
    amount: number
}

const EventPage = () => {
    const { daoName, eventAddr } = useParams()
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const smv = useSmv(dao)
    const { isFetching, event } = useSmvEvent(dao.adapter, eventAddr!)
    const { vote } = useSmvVote(dao.adapter, event)

    /** Submit vote */
    const onVoteSubmit = async (values: TFormValues) => {
        try {
            await vote(values.approve === 'true', values.amount)
            toast.success('Vote accepted, event details will be updated soon')
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    return (
        <div className="bordered-block px-7 py-8">
            {dao.details.isAuthMember && (
                <SmvBalance
                    adapter={smv.adapter}
                    details={smv.details}
                    className="mb-5 bg-gray-100"
                />
            )}

            <div className="mb-4">Event details are reloaded automatically</div>

            {isFetching && !event && (
                <div className="text-gray-606060">
                    <Spinner className="mr-3" />
                    Loading event...
                </div>
            )}

            {event && (
                <div>
                    <h3 className="basis-full text-xl font-semibold mt-4">
                        {event.type.name}
                    </h3>
                    <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 py-1">
                        <div>
                            <FontAwesomeIcon icon={faCalendarDays} className="mr-2" />
                            {new Date(event.time.start).toLocaleString()}
                            <span className="mx-1">-</span>
                            {new Date(event.time.finish).toLocaleString()}
                        </div>
                        <div>
                            <span className="mr-3">
                                {!event.status.completed ? (
                                    <>
                                        <Spinner size="sm" className="mr-2" />
                                        Running
                                    </>
                                ) : event.status.accepted ? (
                                    <span className="text-green-900">Accepted</span>
                                ) : (
                                    <span className="text-rose-600">Rejected</span>
                                )}
                            </span>
                            <div>
                                <span className="text-green-900 text-xs">
                                    Accepted
                                    <span className="text-xl ml-2">
                                        {event.votes.yes}
                                    </span>
                                </span>
                                <span className="mx-1">/</span>
                                <span className="text-rose-600 text-xs">
                                    <span className="text-xl mr-2">{event.votes.no}</span>
                                    Rejected
                                </span>
                                <span className="mx-3">/</span>
                                <span className="text-black-600 text-xs">
                                    <span className="text-xl mr-2">
                                        {event.votes.total}
                                    </span>
                                    Total
                                </span>
                                <span className="mx-3">/</span>
                                <span className="text-black-600 text-xs">
                                    <span className="text-xl mr-2">
                                        {event.votes.yours}
                                    </span>
                                    Yours
                                </span>
                            </div>
                        </div>
                    </div>

                    {dao.details.isAuthMember && !event.status.completed && (
                        <Formik
                            initialValues={{
                                approve: 'true',
                                amount: smv.details.smvAvailable - event.votes.yours,
                            }}
                            onSubmit={onVoteSubmit}
                            validationSchema={Yup.object().shape({
                                amount: Yup.number()
                                    .min(1, 'Should be a number >= 1')
                                    .max(smv.details.smvAvailable - event.votes.yours)
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
                                            disabled={
                                                isSubmitting || smv.details.isLockerBusy
                                            }
                                        >
                                            {isSubmitting && <Spinner className="mr-2" />}
                                            Vote for proposal
                                        </button>
                                    </Form>
                                </div>
                            )}
                        </Formik>
                    )}

                    {event.status.completed && !event.status.accepted && (
                        <div className="bg-rose-600 text-white mt-6 px-4 py-3 rounded">
                            Proposal was rejected by SMV
                        </div>
                    )}

                    {event.type.kind === ESmvEventType.PR && (
                        <PREvent daoName={daoName!} event={event} />
                    )}
                    {(event.type.kind === ESmvEventType.BRANCH_LOCK ||
                        event.type.kind === ESmvEventType.BRANCH_UNLOCK) && (
                        <BranchEvent daoName={daoName} event={event} />
                    )}
                    {(event.type.kind === ESmvEventType.DAO_MEMBER_ADD ||
                        event.type.kind === ESmvEventType.DAO_MEMBER_DELETE) && (
                        <MemberEvent daoName={daoName} event={event} />
                    )}
                    {event?.type.kind === ESmvEventType.DAO_UPGRADE && (
                        <DaoUpgradeEvent daoName={daoName} event={event} />
                    )}
                    {event?.type.kind === ESmvEventType.TASK_CONFIRM && (
                        <TaskConfirmEvent daoName={daoName} event={event} />
                    )}
                    {event?.type.kind === ESmvEventType.TASK_DELETE && (
                        <TaskDeleteEvent daoName={daoName} event={event} />
                    )}
                </div>
            )}
        </div>
    )
}

export default EventPage
