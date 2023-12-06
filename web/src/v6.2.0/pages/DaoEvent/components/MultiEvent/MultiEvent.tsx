import { EDaoEventType } from '../../../../../types/common.types'
import { TDaoEventDetails } from '../../../../types/dao.types'
import { AddRegularTokensEvent } from '../AddRegularTokensEvent/AddRegularTokensEvent'
import { AddVotingTokensEvent } from '../AddVotingTokensEvent/AddVotingTokensEvent'
import { AllowDaoEventDiscussionEvent } from '../AllowDaoEventDiscussionEvent/AllowDaoEventDiscussionEvent'
import { AskDaoMembershipEvent } from '../AskDaoMembershipEvent/AskDaoMembershipEvent'
import { BranchCreateEvent } from '../BranchCreateEvent/BranchCreateEvent'
import { CreateDaoTagEvent } from '../CreateDaoTagEvent/CreateDaoTagEvent'
import { CreateTaskEvent } from '../CreateTaskEvent/CreateTaskEvent'
import { DaoExpertTagCreateEvent } from '../DaoExpertTagCreateEvent/DaoExpertTagCreateEvent'
import { DaoExpertTagDeleteEvent } from '../DaoExpertTagDeleteEvent/DaoExpertTagDeleteEvent'
import { DaoMemberExpertTagCreateEvent } from '../DaoMemberExpertTagCreateEvent/DaoMemberExpertTagCreateEvent'
import { DaoMemberExpertTagDeleteEvent } from '../DaoMemberExpertTagDeleteEvent/DaoMemberExpertTagDeleteEvent'
import { DeleteDaoTagEvent } from '../DeleteDaoTagEvent/DeleteDaoTagEvent'
import { DeleteTaskEvent } from '../DeleteTaskEvent/DeleteTaskEvent'
import { DisableMintTokensEvent } from '../DisableMintTokensEvent/DisableMintTokensEvent'
import { HackathonCreateEvent } from '../HackathonCreateEvent/HackathonCreateEvent'
import { HackathonUpdateEvent } from '../HackathonUpdateEvent/HackathonUpdateEvent'
import { MemberAddEvent } from '../MemberAddEvent/MemberAddEvent'
import { MemberDeleteEvent } from '../MemberDeleteEvent/MemberDeleteEvent'
import { MemberUpdateEvent } from '../MemberUpdateEvent/MemberUpdateEvent'
import { MilestoneCompleteEvent } from '../MilestoneCompleteEvent/MilestoneCompleteEvent'
import { MilestoneCreateEvent } from '../MilestoneCreateEvent/MilestoneCreateEvent'
import { MilestoneDeleteEvent } from '../MilestoneDeleteEvent/MilestoneDeleteEvent'
import { MilestoneUpgradeEvent } from '../MilestoneUpgradeEvent/MilestoneUpgradeEvent'
import { MintTokensEvent } from '../MintTokensEvent/MintTokensEvent'
import { RedeployTaskCompleteEvent } from '../RedeployTaskCompleteEvent/RedeployTaskCompleteEvent'
import { RedeployTaskEvent } from '../RedeployTaskEvent/RedeployTaskEvent'
import { RepositoryCreateEvent } from '../RepositoryCreateEvent/RepositoryCreateEvent'
import { RepositoryDescriptionEvent } from '../RepositoryDescriptionEvent/RepositoryDescriptionEvent'
import { RepositoryTagAddEvent } from '../RepositoryTagAddEvent/RepositoryTagAddEvent'
import { RepositoryTagDeleteEvent } from '../RepositoryTagDeleteEvent/RepositoryTagDeleteEvent'
import { ShowDaoEventProgressEvent } from '../ShowDaoEventProgressEvent/ShowDaoEventProgressEvent'
import { UpgradeTaskEvent } from '../UpgradeTaskEvent/UpgradeTaskEvent'

type TMultiEventProps = {
    event: TDaoEventDetails
}

const MultiEvent = (props: TMultiEventProps) => {
    const { event } = props

    return (
        <div className="flex flex-col divide-y divide-gray-e6edff">
            {event.data.items
                .filter((data: any) => data.type !== EDaoEventType.DELAY)
                .map((item: any, index: number) => (
                    <div className="py-3" key={index}>
                        <h3 className="font-medium text-sm">{item.label}</h3>
                        {item.data.comment && (
                            <div className="mt-2 text-xs">{item.data.comment}</div>
                        )}

                        {item.type === EDaoEventType.REPO_CREATE && (
                            <RepositoryCreateEvent
                                key={index}
                                data={item.data}
                                isCompleted={event.status.completed}
                            />
                        )}
                        {item.type === EDaoEventType.REPO_TAG_ADD && (
                            <RepositoryTagAddEvent key={index} data={item.data} />
                        )}
                        {item.type === EDaoEventType.REPO_TAG_REMOVE && (
                            <RepositoryTagDeleteEvent key={index} data={item.data} />
                        )}
                        {item.type === EDaoEventType.REPO_UPDATE_DESCRIPTION && (
                            <RepositoryDescriptionEvent key={index} data={item.data} />
                        )}
                        {item.type === EDaoEventType.DAO_MEMBER_ADD && (
                            <MemberAddEvent key={index} data={item.data} />
                        )}
                        {item.type === EDaoEventType.DAO_MEMBER_DELETE && (
                            <MemberDeleteEvent key={index} data={item.data} />
                        )}
                        {item.type === EDaoEventType.DAO_TOKEN_MINT && (
                            <MintTokensEvent key={index} data={item.data} />
                        )}
                        {item.type === EDaoEventType.DAO_TOKEN_VOTING_ADD && (
                            <AddVotingTokensEvent key={index} data={item.data} />
                        )}
                        {item.type === EDaoEventType.DAO_TOKEN_REGULAR_ADD && (
                            <AddRegularTokensEvent key={index} data={item.data} />
                        )}
                        {item.type === EDaoEventType.DAO_TAG_ADD && (
                            <CreateDaoTagEvent key={index} data={item.data} />
                        )}
                        {item.type === EDaoEventType.DAO_TAG_REMOVE && (
                            <DeleteDaoTagEvent key={index} data={item.data} />
                        )}
                        {item.type === EDaoEventType.DAO_EVENT_HIDE_PROGRESS && (
                            <ShowDaoEventProgressEvent key={index} data={item.data} />
                        )}
                        {item.type === EDaoEventType.DAO_EVENT_ALLOW_DISCUSSION && (
                            <AllowDaoEventDiscussionEvent key={index} data={item.data} />
                        )}
                        {item.type === EDaoEventType.DAO_ASK_MEMBERSHIP_ALLOWANCE && (
                            <AskDaoMembershipEvent key={index} data={item.data} />
                        )}
                        {item.type === EDaoEventType.DAO_TOKEN_MINT_DISABLE && (
                            <DisableMintTokensEvent key={index} data={item.data} />
                        )}
                        {item.type === EDaoEventType.DAO_ALLOWANCE_CHANGE && (
                            <MemberUpdateEvent key={index} data={item.data} />
                        )}
                        {item.type === EDaoEventType.TASK_CREATE && (
                            <CreateTaskEvent key={index} data={item.data} />
                        )}
                        {item.type === EDaoEventType.TASK_DELETE && (
                            <DeleteTaskEvent key={index} data={item.data} />
                        )}
                        {item.type === EDaoEventType.TASK_UPGRADE && (
                            <UpgradeTaskEvent key={index} data={item.data} />
                        )}
                        {item.type === EDaoEventType.TASK_REDEPLOY && (
                            <RedeployTaskEvent key={index} data={item.data} />
                        )}
                        {item.type === EDaoEventType.TASK_REDEPLOYED && (
                            <RedeployTaskCompleteEvent key={index} data={item.data} />
                        )}
                        {item.type === EDaoEventType.MILESTONE_CREATE && (
                            <MilestoneCreateEvent key={index} data={item.data} />
                        )}
                        {item.type === EDaoEventType.MILESTONE_DELETE && (
                            <MilestoneDeleteEvent key={index} data={item.data} />
                        )}
                        {item.type === EDaoEventType.MILESTONE_COMPLETE && (
                            <MilestoneCompleteEvent key={index} data={item.data} />
                        )}
                        {item.type === EDaoEventType.MILESTONE_UPGRADE && (
                            <MilestoneUpgradeEvent key={index} data={item.data} />
                        )}
                        {item.type === EDaoEventType.DAO_EXPERT_TAG_CREATE && (
                            <DaoExpertTagCreateEvent key={index} data={item.data} />
                        )}
                        {item.type === EDaoEventType.DAO_EXPERT_TAG_DELETE && (
                            <DaoExpertTagDeleteEvent key={index} data={item.data} />
                        )}
                        {item.type === EDaoEventType.DAO_MEMBER_EXPERT_TAG_CREATE && (
                            <DaoMemberExpertTagCreateEvent key={index} data={item.data} />
                        )}
                        {item.type === EDaoEventType.DAO_MEMBER_EXPERT_TAG_DELETE && (
                            <DaoMemberExpertTagDeleteEvent key={index} data={item.data} />
                        )}
                        {item.type === EDaoEventType.HACKATHON_CREATE && (
                            <HackathonCreateEvent key={index} data={item.data} />
                        )}
                        {item.type === EDaoEventType.HACKATHON_UPDATE && (
                            <HackathonUpdateEvent key={index} data={item.data} />
                        )}
                        {item.type === EDaoEventType.BRANCH_CREATE && (
                            <BranchCreateEvent key={index} data={item.data} />
                        )}
                    </div>
                ))}
        </div>
    )
}

export { MultiEvent }
