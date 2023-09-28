import { MemberIcon } from '../../../../../components/Dao'
import { TaskGrantList } from '../../../../components/Task'
import { EDaoMemberType, TTaskGrant } from '../../../../types/dao.types'

type TMilestoneCreateEventProps = {
    data: {
        taskName: string
        repoName: string
        tagsRaw: string[]
        tags: string[]
        grant: TTaskGrant
        grantTotal: any
        budget: number
        manager: { username: string; usertype: EDaoMemberType }
    }
}

const MilestoneCreateEvent = (props: TMilestoneCreateEventProps) => {
    const { data } = props

    return (
        <div className="flex flex-col gap-2 py-3">
            <div className="flex items-center gap-6">
                <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                    Milestone name
                </div>
                <div className="text-sm">{data.taskName}</div>
            </div>
            <div className="flex items-center gap-6">
                <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                    Repository
                </div>
                <div className="text-sm">{data.repoName}</div>
            </div>
            <div className="flex items-center gap-6">
                <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                    Tags
                </div>
                <div className="text-sm">{data.tags.map((v) => `#${v}`).join(', ')}</div>
            </div>
            <div className="flex items-center gap-6">
                <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                    Budget
                </div>
                <div className="text-sm">{data.budget.toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-6">
                <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                    Manager
                </div>
                <div className="text-sm">
                    <MemberIcon
                        type={data.manager.usertype}
                        className="mr-1"
                        size="sm"
                        fixedWidth
                    />
                    {data.manager.username}
                </div>
            </div>
            <div className="flex items-center gap-6">
                <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                    Manager reward
                </div>
                <div className="text-sm">{data.grantTotal.manager.toLocaleString()}</div>
            </div>
            <div className="mt-4 overflow-hidden overflow-x-scroll">
                <TaskGrantList config={data.grant} />
            </div>
        </div>
    )
}

export { MilestoneCreateEvent }
