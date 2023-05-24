import { ESmvEventType, shortString, TSmvEvent } from 'react-gosh'
import { IGoshAdapter } from 'react-gosh/dist/gosh/interfaces'
import { DaoAskMembershipAllowanceEvent } from '../DaoAskMembershipAllowanceEvent/DaoAskMembershipAllowanceEvent'
import { DaoEventAllowDiscussionEvent } from '../DaoEventAllowDiscussionEvent/DaoEventAllowDiscussionEvent'
import { DaoEventShowProgressEvent } from '../DaoEventShowProgressEvent/DaoEventShowProgressEvent'
import { DaoMintDisableEvent } from '../DaoMintDisableEvent/DaoMintDisableEvent'
import { DaoMintReserveEvent } from '../DaoMintReserveEvent/DaoMintReserveEvent'
import { DaoReceiveBountyEvent } from '../DaoReceiveBountyEvent/DaoReceiveBountyEvent'
import { DaoReviewEvent } from '../DaoReviewEvent/DaoReviewEvent'
import { DaoTagAddEvent } from '../DaoTagAddEvent/DaoTagAddEvent'
import { DaoTagRemoveEvent } from '../DaoTagRemoveEvent/DaoTagRemoveEvent'
import { DaoTokenDaoLockEvent } from '../DaoTokenDaoLockEvent/DaoTokenDaoLockEvent'
import { DaoTokenDaoSendEvent } from '../DaoTokenDaoSendEvent/DaoTokenDaoSendEvent'
import { DaoTokenRegularAddEvent } from '../DaoTokenRegularAddEvent/DaoTokenRegularAddEvent'
import { DaoTokenVotingAddEvent } from '../DaoTokenVotingAddEvent/DaoTokenVotingAddEvent'
import { DaoUpgradeEvent } from '../DaoUpgradeEvent/DaoUpgradeEvent'
import { DaoVoteEvent } from '../DaoVoteEvent/DaoVoteEvent'
import { MemberAddEvent } from '../MemberAddEvent/MemberAddEvent'
import { MemberAllowanceEvent } from '../MemberAllowanceEvent/MemberAllowanceEvent'
import { MemberRemoveEvent } from '../MemberRemoveEvent/MemberRemoveEvent'
import { RepoBranchEvent } from '../RepoBranchEvent/RepoBranchEvent'
import { RepoCreateEvent } from '../RepoCreateEvent/RepoCreateEvent'
import { RepoDescriptionEvent } from '../RepoDescriptionEvent/RepoDescriptionEvent'
import { RepoTagAddEvent } from '../RepoTagAddEvent/RepoTagAddEvent'
import { RepoTagRemoveEvent } from '../RepoTagRemoveEvent/RepoTagRemoveEvent'
import { TaskCreateEvent } from '../TaskCreateEvent/TaskCreateEvent'
import { TaskDeleteEvent } from '../TaskDeleteEvent/TaskDeleteEvent'
import { TaskTransferCompleteEvent } from '../TaskTransferCompleteEvent/TaskTransferCompleteEvent'
import { TaskTransferEvent } from '../TaskTransferEvent/TaskTransferEvent'
import { TaskUpgradeEvent } from '../TaskUpgradeEvent/TaskUpgradeEvent'
import { DaoStartPaidMembershipEvent } from '../DaoStartPaidMembershipEvent/DaoStartPaidMembershipEvent'
import { DaoStopPaidMembershipEvent } from '../DaoStopPaidMembershipEvent/DaoStopPaidMembershipEvent'
import { BigTaskCreateEvent } from '../BigTaskCreateEvent/BigTaskCreateEvent'
import { BigTaskApproveEvent } from '../BigTaskApproveEvent/BigTaskApproveEvent'
import { BigTaskDeleteEvent } from '../BigTaskDeleteEvent/BigTaskDeleteEvent'
import { BigTaskUpgradeEvent } from '../BigTaskUpgradeEvent/BigTaskUpgradeEvent'

type TMultiEventProps = {
    version: string
    event: TSmvEvent
    gosh: IGoshAdapter
}

const MultiEvent = (props: TMultiEventProps) => {
    const { version, event, gosh } = props

    return (
        <>
            {event.data.details && (
                <div className="mb-4">
                    {event.type.kind === ESmvEventType.MULTI_PROPOSAL_AS_DAO && (
                        <div className="text-xs">
                            Wallet: {shortString(event.data.details.wallet)}
                        </div>
                    )}
                </div>
            )}

            <div className="flex flex-col divide-y divide-gray-e6edff">
                {event.data.items
                    .filter((data: any) => data.type.kind !== ESmvEventType.DELAY)
                    .map((data: any, index: number) => (
                        <div className="py-3" key={index}>
                            <h3>{data.type.name}</h3>
                            {data.type.kind === ESmvEventType.REPO_CREATE && (
                                <RepoCreateEvent key={index} data={data} />
                            )}
                            {data.type.kind === ESmvEventType.BRANCH_LOCK && (
                                <RepoBranchEvent
                                    key={index}
                                    type={data.type}
                                    data={data}
                                />
                            )}
                            {data.type.kind === ESmvEventType.BRANCH_UNLOCK && (
                                <RepoBranchEvent
                                    key={index}
                                    type={data.type}
                                    data={data}
                                />
                            )}
                            {data.type.kind === ESmvEventType.REPO_TAG_ADD && (
                                <RepoTagAddEvent key={index} data={data} />
                            )}
                            {data.type.kind === ESmvEventType.REPO_TAG_REMOVE && (
                                <RepoTagRemoveEvent key={index} data={data} />
                            )}
                            {data.type.kind === ESmvEventType.REPO_UPDATE_DESCRIPTION && (
                                <RepoDescriptionEvent key={index} data={data} />
                            )}
                            {data.type.kind === ESmvEventType.DAO_MEMBER_ADD && (
                                <MemberAddEvent
                                    key={index}
                                    version={version}
                                    data={data}
                                    gosh={gosh}
                                />
                            )}
                            {data.type.kind === ESmvEventType.DAO_MEMBER_DELETE && (
                                <MemberRemoveEvent key={index} data={data} gosh={gosh} />
                            )}
                            {data.type.kind === ESmvEventType.DAO_TOKEN_VOTING_ADD && (
                                <DaoTokenVotingAddEvent
                                    key={index}
                                    data={data}
                                    gosh={gosh}
                                />
                            )}
                            {data.type.kind === ESmvEventType.DAO_TOKEN_REGULAR_ADD && (
                                <DaoTokenRegularAddEvent
                                    key={index}
                                    data={data}
                                    gosh={gosh}
                                />
                            )}
                            {data.type.kind === ESmvEventType.DAO_TAG_ADD && (
                                <DaoTagAddEvent key={index} data={data} />
                            )}
                            {data.type.kind === ESmvEventType.DAO_TAG_REMOVE && (
                                <DaoTagRemoveEvent key={index} data={data} />
                            )}
                            {data.type.kind ===
                                ESmvEventType.DAO_EVENT_ALLOW_DISCUSSION && (
                                <DaoEventAllowDiscussionEvent key={index} data={data} />
                            )}
                            {data.type.kind === ESmvEventType.DAO_EVENT_HIDE_PROGRESS && (
                                <DaoEventShowProgressEvent key={index} data={data} />
                            )}
                            {data.type.kind ===
                                ESmvEventType.DAO_ASK_MEMBERSHIP_ALLOWANCE && (
                                <DaoAskMembershipAllowanceEvent key={index} data={data} />
                            )}
                            {data.type.kind === ESmvEventType.DAO_TOKEN_MINT_DISABLE && (
                                <DaoMintDisableEvent key={index} data={data} />
                            )}
                            {data.type.kind === ESmvEventType.DAO_TOKEN_MINT && (
                                <DaoMintReserveEvent key={index} data={data} />
                            )}
                            {data.type.kind === ESmvEventType.DAO_UPGRADE && (
                                <DaoUpgradeEvent key={index} data={data} />
                            )}
                            {data.type.kind === ESmvEventType.DAO_ALLOWANCE_CHANGE && (
                                <MemberAllowanceEvent
                                    key={index}
                                    data={data}
                                    gosh={gosh}
                                />
                            )}
                            {data.type.kind === ESmvEventType.TASK_CREATE && (
                                <TaskCreateEvent key={index} data={data} />
                            )}
                            {data.type.kind === ESmvEventType.TASK_DELETE && (
                                <TaskDeleteEvent key={index} data={data} />
                            )}
                            {data.type.kind === ESmvEventType.DAO_VOTE && (
                                <DaoVoteEvent key={index} data={data} />
                            )}
                            {data.type.kind === ESmvEventType.DAO_TOKEN_DAO_SEND && (
                                <DaoTokenDaoSendEvent data={data} />
                            )}
                            {data.type.kind === ESmvEventType.DAO_REVIEWER && (
                                <DaoReviewEvent data={data} />
                            )}
                            {data.type.kind === ESmvEventType.DAO_RECEIVE_BOUNTY && (
                                <DaoReceiveBountyEvent data={data} />
                            )}
                            {data.type.kind === ESmvEventType.DAO_TOKEN_DAO_LOCK && (
                                <DaoTokenDaoLockEvent data={data} />
                            )}
                            {data.type.kind === ESmvEventType.TASK_REDEPLOY && (
                                <TaskTransferEvent data={data} />
                            )}
                            {data.type.kind === ESmvEventType.TASK_UPGRADE && (
                                <TaskUpgradeEvent data={data} />
                            )}
                            {data.type.kind === ESmvEventType.TASK_REDEPLOYED && (
                                <TaskTransferCompleteEvent />
                            )}
                            {data.type.kind ===
                                ESmvEventType.DAO_START_PAID_MEMBERSHIP && (
                                <DaoStartPaidMembershipEvent data={data} />
                            )}
                            {data.type.kind ===
                                ESmvEventType.DAO_STOP_PAID_MEMBERSHIP && (
                                <DaoStopPaidMembershipEvent data={data} />
                            )}
                            {data.type.kind === ESmvEventType.BIGTASK_CREATE && (
                                <BigTaskCreateEvent data={data} />
                            )}
                            {data.type.kind === ESmvEventType.BIGTASK_APPROVE && (
                                <BigTaskApproveEvent data={data} />
                            )}
                            {data.type.kind === ESmvEventType.BIGTASK_DELETE && (
                                <BigTaskDeleteEvent data={data} />
                            )}
                            {data.type.kind === ESmvEventType.BIGTASK_UPGRADE && (
                                <BigTaskUpgradeEvent data={data} />
                            )}
                        </div>
                    ))}
            </div>
        </>
    )
}

export { MultiEvent }
