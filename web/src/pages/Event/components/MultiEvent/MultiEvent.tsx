import { ESmvEventType, TSmvEvent } from 'react-gosh'
import { DaoAskMembershipAllowanceEvent } from '../DaoAskMembershipAllowanceEvent/DaoAskMembershipAllowanceEvent'
import { DaoEventAllowDiscussionEvent } from '../DaoEventAllowDiscussionEvent/DaoEventAllowDiscussionEvent'
import { DaoEventShowProgressEvent } from '../DaoEventShowProgressEvent/DaoEventShowProgressEvent'
import { DaoMintDisableEvent } from '../DaoMintDisableEvent/DaoMintDisableEvent'
import { DaoMintReserveEvent } from '../DaoMintReserveEvent/DaoMintReserveEvent'
import { DaoTagAddEvent } from '../DaoTagAddEvent/DaoTagAddEvent'
import { DaoTagRemoveEvent } from '../DaoTagRemoveEvent/DaoTagRemoveEvent'
import { DaoTokenRegularAddEvent } from '../DaoTokenRegularAddEvent/DaoTokenRegularAddEvent'
import { DaoTokenVotingAddEvent } from '../DaoTokenVotingAddEvent/DaoTokenVotingAddEvent'
import { DaoUpgradeEvent } from '../DaoUpgradeEvent/DaoUpgradeEvent'
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

type TMultiEventProps = {
    version: string
    event: TSmvEvent
}

const MultiEvent = (props: TMultiEventProps) => {
    const { version, event } = props

    return (
        <div className="flex flex-col divide-y divide-gray-e6edff">
            {event.data.map((data: any, index: number) => (
                <div className="py-3" key={index}>
                    <h3>{data.type.name}</h3>
                    {data.type.kind === ESmvEventType.REPO_CREATE && (
                        <RepoCreateEvent key={index} data={data} />
                    )}
                    {data.type.kind === ESmvEventType.BRANCH_LOCK && (
                        <RepoBranchEvent key={index} type={data.type} data={data} />
                    )}
                    {data.type.kind === ESmvEventType.BRANCH_UNLOCK && (
                        <RepoBranchEvent key={index} type={data.type} data={data} />
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
                        <MemberAddEvent key={index} version={version} data={data} />
                    )}
                    {data.type.kind === ESmvEventType.DAO_MEMBER_DELETE && (
                        <MemberRemoveEvent key={index} data={data} />
                    )}
                    {data.type.kind === ESmvEventType.DAO_TOKEN_VOTING_ADD && (
                        <DaoTokenVotingAddEvent key={index} data={data} />
                    )}
                    {data.type.kind === ESmvEventType.DAO_TOKEN_REGULAR_ADD && (
                        <DaoTokenRegularAddEvent key={index} data={data} />
                    )}
                    {data.type.kind === ESmvEventType.DAO_TAG_ADD && (
                        <DaoTagAddEvent key={index} data={data} />
                    )}
                    {data.type.kind === ESmvEventType.DAO_TAG_REMOVE && (
                        <DaoTagRemoveEvent key={index} data={data} />
                    )}
                    {data.type.kind === ESmvEventType.DAO_EVENT_ALLOW_DISCUSSION && (
                        <DaoEventAllowDiscussionEvent key={index} data={data} />
                    )}
                    {data.type.kind === ESmvEventType.DAO_EVENT_HIDE_PROGRESS && (
                        <DaoEventShowProgressEvent key={index} data={data} />
                    )}
                    {data.type.kind === ESmvEventType.DAO_ASK_MEMBERSHIP_ALLOWANCE && (
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
                        <MemberAllowanceEvent key={index} data={data} />
                    )}
                    {data.type.kind === ESmvEventType.TASK_CREATE && (
                        <TaskCreateEvent key={index} data={data} />
                    )}
                    {data.type.kind === ESmvEventType.TASK_DELETE && (
                        <TaskDeleteEvent key={index} data={data} />
                    )}
                </div>
            ))}
        </div>
    )
}

export { MultiEvent }
