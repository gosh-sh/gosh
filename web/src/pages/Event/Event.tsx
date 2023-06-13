import { useOutletContext, useParams } from 'react-router-dom'
import { classNames, ESmvEventType, shortString, useSmvEvent, useUser } from 'react-gosh'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import Loader from '../../components/Loader'
import { EventProgressBar, EventStatusBadge } from '../../components/Event'
import CopyClipboard from '../../components/CopyClipboard'
import moment from 'moment'
import {
    EventVotingForm,
    MemberAddEvent,
    MemberRemoveEvent,
    MemberAllowanceEvent,
    DaoMintReserveEvent,
    DaoUpgradeEvent,
    DaoMintDisableEvent,
    RepoBranchEvent,
    RepoPullRequestEvent,
    RepoCreateEvent,
    TaskCreateEvent,
    TaskDeleteEvent,
    DaoEventShowProgressEvent,
    DaoEventAllowDiscussionEvent,
    DaoAskMembershipAllowanceEvent,
    DaoTokenVotingAddEvent,
    DaoTokenRegularAddEvent,
    DaoTagAddEvent,
    DaoTagRemoveEvent,
    EventReviewForm,
    RepoTagAddEvent,
    RepoTagRemoveEvent,
    RepoDescriptionEvent,
    MultiEvent,
    DaoVoteEvent,
    DaoTokenDaoSendEvent,
    DaoReviewEvent,
    DaoReceiveBountyEvent,
    DaoTokenDaoLockEvent,
    TaskUpgradeEvent,
    DaoTokenDaoTransferEvent,
    UpgradeVersionControllerEvent,
    DaoStartPaidMembershipEvent,
    DaoStopPaidMembershipEvent,
    BigTaskCreateEvent,
    BigTaskApproveEvent,
    BigTaskDeleteEvent,
    BigTaskUpgradeEvent,
} from './components'
import { Tooltip } from 'react-tooltip'

const EventPage = () => {
    const { eventAddr } = useParams()
    const { user } = useUser()
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const { event, isFetching } = useSmvEvent(dao.adapter, eventAddr!)

    const getDurationDelta = () => {
        const ms = moment(event?.time.finish).diff(moment())
        const delta = moment.duration(ms)
        return `${delta.days()}d ${delta.hours()}h ${delta.minutes()}m`
    }

    if (isFetching && !event) {
        return <Loader>Loading event...</Loader>
    }
    if (!isFetching && !event) {
        return <div>Event not found</div>
    }
    if (!event) {
        return null
    }
    return (
        <div>
            <div>
                <h3 className="text-xl font-medium mb-4">{event.type.name}</h3>
                <div
                    className={classNames(
                        'flex flex-wrap items-center gap-x-5 gap-y-2',
                        'text-sm text-gray-7c8db5',
                    )}
                >
                    <EventStatusBadge status={event.status} />
                    <div className="grow text-gray-7c8db5 text-sm">
                        {!event.reviewers.length ? (
                            <>
                                Created {new Date(event.time.start).toLocaleDateString()}
                                <span className="mx-1">-</span>
                                Executed{' '}
                                {new Date(event.time.finish).toLocaleDateString()}
                            </>
                        ) : (
                            'Review required'
                        )}
                    </div>
                    <div>
                        <CopyClipboard
                            label={
                                <span
                                    data-tooltip-id="common-tip"
                                    data-tooltip-content="Event address"
                                >
                                    {shortString(eventAddr!)}
                                </span>
                            }
                            componentProps={{
                                text: eventAddr!,
                            }}
                        />
                    </div>
                </div>
            </div>
            <div className="mt-8 row flex-wrap">
                <div className="col !basis-full md:!basis-0">
                    {event.data.comment && (
                        <div className="border border-gray-e6edff rounded-xl px-4 py-5 mb-6">
                            <h3 className="mb-3 text-xl font-medium">
                                Event description
                            </h3>
                            <div className="text-sm">{event.data.comment}</div>
                        </div>
                    )}

                    <div className="border border-gray-e6edff rounded-xl px-4 py-5 overflow-clip">
                        <h3 className="mb-3 text-xl font-medium">Event details</h3>
                        {event.type.kind === ESmvEventType.DAO_MEMBER_ADD && (
                            <MemberAddEvent
                                version={dao.details.version}
                                data={event.data}
                                gosh={dao.adapter.getGosh()}
                            />
                        )}
                        {event.type.kind === ESmvEventType.DAO_MEMBER_DELETE && (
                            <MemberRemoveEvent
                                data={event.data}
                                gosh={dao.adapter.getGosh()}
                            />
                        )}
                        {event.type.kind === ESmvEventType.DAO_ALLOWANCE_CHANGE && (
                            <MemberAllowanceEvent
                                data={event.data}
                                gosh={dao.adapter.getGosh()}
                            />
                        )}
                        {event.type.kind === ESmvEventType.DAO_TOKEN_MINT && (
                            <DaoMintReserveEvent data={event.data} />
                        )}
                        {event.type.kind === ESmvEventType.DAO_UPGRADE && (
                            <DaoUpgradeEvent data={event.data} />
                        )}
                        {event.type.kind === ESmvEventType.DAO_TOKEN_MINT_DISABLE && (
                            <DaoMintDisableEvent data={event.data} />
                        )}
                        {event.type.kind === ESmvEventType.REPO_CREATE && (
                            <RepoCreateEvent data={event.data} />
                        )}
                        {(event.type.kind === ESmvEventType.BRANCH_LOCK ||
                            event.type.kind === ESmvEventType.BRANCH_UNLOCK) && (
                            <RepoBranchEvent type={event.type} data={event.data} />
                        )}
                        {event.type.kind === ESmvEventType.PULL_REQUEST && (
                            <RepoPullRequestEvent
                                daoName={dao.details.name}
                                event={event}
                            />
                        )}
                        {event.type.kind === ESmvEventType.TASK_CREATE && (
                            <TaskCreateEvent data={event.data} />
                        )}
                        {event.type.kind === ESmvEventType.TASK_DELETE && (
                            <TaskDeleteEvent data={event.data} />
                        )}
                        {event.type.kind === ESmvEventType.DAO_EVENT_HIDE_PROGRESS && (
                            <DaoEventShowProgressEvent data={event.data} />
                        )}
                        {event.type.kind === ESmvEventType.DAO_EVENT_ALLOW_DISCUSSION && (
                            <DaoEventAllowDiscussionEvent data={event.data} />
                        )}
                        {event.type.kind ===
                            ESmvEventType.DAO_ASK_MEMBERSHIP_ALLOWANCE && (
                            <DaoAskMembershipAllowanceEvent data={event.data} />
                        )}
                        {event.type.kind === ESmvEventType.DAO_TOKEN_VOTING_ADD && (
                            <DaoTokenVotingAddEvent
                                data={event.data}
                                gosh={dao.adapter.getGosh()}
                            />
                        )}
                        {event.type.kind === ESmvEventType.DAO_TOKEN_REGULAR_ADD && (
                            <DaoTokenRegularAddEvent
                                data={event.data}
                                gosh={dao.adapter.getGosh()}
                            />
                        )}
                        {event.type.kind === ESmvEventType.DAO_TAG_ADD && (
                            <DaoTagAddEvent data={event.data} />
                        )}
                        {event.type.kind === ESmvEventType.DAO_TAG_REMOVE && (
                            <DaoTagRemoveEvent data={event.data} />
                        )}
                        {event.type.kind === ESmvEventType.REPO_TAG_ADD && (
                            <RepoTagAddEvent data={event.data} />
                        )}
                        {event.type.kind === ESmvEventType.REPO_TAG_REMOVE && (
                            <RepoTagRemoveEvent data={event.data} />
                        )}
                        {event.type.kind === ESmvEventType.REPO_UPDATE_DESCRIPTION && (
                            <RepoDescriptionEvent data={event.data} />
                        )}
                        {(event.type.kind === ESmvEventType.MULTI_PROPOSAL ||
                            event.type.kind === ESmvEventType.MULTI_PROPOSAL_AS_DAO) && (
                            <MultiEvent
                                version={dao.details.version}
                                event={event}
                                gosh={dao.adapter.getGosh()}
                            />
                        )}
                        {event.type.kind === ESmvEventType.DAO_VOTE && (
                            <DaoVoteEvent data={event.data} />
                        )}
                        {event.type.kind === ESmvEventType.DAO_TOKEN_DAO_SEND && (
                            <DaoTokenDaoSendEvent data={event.data} />
                        )}
                        {event.type.kind === ESmvEventType.DAO_REVIEWER && (
                            <DaoReviewEvent data={event.data} />
                        )}
                        {event.type.kind === ESmvEventType.DAO_RECEIVE_BOUNTY && (
                            <DaoReceiveBountyEvent data={event.data} />
                        )}
                        {event.type.kind === ESmvEventType.DAO_TOKEN_DAO_LOCK && (
                            <DaoTokenDaoLockEvent data={event.data} />
                        )}
                        {event.type.kind === ESmvEventType.TASK_UPGRADE && (
                            <TaskUpgradeEvent data={event.data} />
                        )}
                        {event.type.kind ===
                            ESmvEventType.DAO_TOKEN_TRANSFER_FROM_PREV && (
                            <DaoTokenDaoTransferEvent data={event.data} />
                        )}
                        {event.type.kind === ESmvEventType.UPGRADE_VERSION_CONTROLLER && (
                            <UpgradeVersionControllerEvent data={event.data} />
                        )}
                        {event.type.kind === ESmvEventType.DAO_START_PAID_MEMBERSHIP && (
                            <DaoStartPaidMembershipEvent data={event.data} />
                        )}
                        {event.type.kind === ESmvEventType.DAO_STOP_PAID_MEMBERSHIP && (
                            <DaoStopPaidMembershipEvent data={event.data} />
                        )}
                        {event.type.kind === ESmvEventType.BIGTASK_CREATE && (
                            <BigTaskCreateEvent data={event.data} />
                        )}
                        {event.type.kind === ESmvEventType.BIGTASK_APPROVE && (
                            <BigTaskApproveEvent data={event.data} />
                        )}
                        {event.type.kind === ESmvEventType.BIGTASK_DELETE && (
                            <BigTaskDeleteEvent data={event.data} />
                        )}
                        {event.type.kind === ESmvEventType.BIGTASK_UPGRADE && (
                            <BigTaskUpgradeEvent data={event.data} />
                        )}
                    </div>
                </div>

                <div className="col !basis-full md:!basis-[18rem] lg:!basis-[20.4375rem] !grow-0">
                    <div className="border border-gray-e6edff rounded-xl p-5">
                        {(dao.details.isEventProgressOn || event.status?.completed) && (
                            <EventProgressBar votes={event.votes} />
                        )}
                        <div className="mt-5 text-sm text-gray-7c8db5 text-center">
                            {!event.reviewers.length && !event.status.completed && (
                                <>{getDurationDelta()} to end</>
                            )}
                            {event.reviewers.length > 0 && 'Review required'}
                        </div>
                    </div>

                    {!event.status.completed &&
                        dao.details.isAuthMember &&
                        !event.reviewers.length && (
                            <div className="mt-5 border border-gray-e6edff rounded-xl p-5">
                                <h3 className="mb-4 text-xl font-medium">Your vote</h3>
                                <EventVotingForm dao={dao} event={event} />
                            </div>
                        )}

                    {!event.status.completed && !!event.reviewers.length && (
                        <div className="mt-5 border border-gray-e6edff rounded-xl p-5">
                            <h3 className="mb-4 text-xl font-medium">Event review</h3>
                            <div className="text-sm">
                                Review required from:
                                <ul>
                                    {event.reviewers.map((username, index) => (
                                        <li key={index}>{username}</li>
                                    ))}
                                </ul>
                            </div>

                            {event.reviewers.indexOf(user.username || '') >= 0 && (
                                <div className="mt-3">
                                    <EventReviewForm dao={dao.adapter} event={event} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <Tooltip id="common-tip" clickable />
        </div>
    )
}

export default EventPage
