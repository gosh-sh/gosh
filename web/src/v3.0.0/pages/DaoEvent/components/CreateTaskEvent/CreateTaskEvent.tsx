import { TaskGrantList } from '../../../../components/Task'
import { TTaskGrant } from '../../../../types/dao.types'

type TCreateTaskEventProps = {
    data: {
        taskname: string
        reponame: string
        tagsRaw: string[]
        tags: string[]
        grant: TTaskGrant
        grantTotal: any
        reward: number
    }
}

const CreateTaskEvent = (props: TCreateTaskEventProps) => {
    const { data } = props

    return (
        <div className="flex flex-col gap-2 py-3">
            <div className="flex items-center gap-6">
                <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                    Task name
                </div>
                <div className="text-sm">{data.taskname}</div>
            </div>
            <div className="flex items-center gap-6">
                <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                    Repository
                </div>
                <div className="text-sm">{data.reponame}</div>
            </div>
            <div className="flex items-center gap-6">
                <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                    Tags
                </div>
                <div className="text-sm">{data.tags.map((v) => `#${v}`).join(', ')}</div>
            </div>
            <div className="flex items-center gap-6">
                <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                    Reward
                </div>
                <div className="text-sm">{data.reward.toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-6">
                <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                    Assigners reward
                </div>
                <div className="text-sm">{data.grantTotal.assign.toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-6">
                <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                    Managers reward
                </div>
                <div className="text-sm">{data.grantTotal.manager.toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-6">
                <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                    Reviewers reward
                </div>
                <div className="text-sm">{data.grantTotal.review.toLocaleString()}</div>
            </div>
            <div className="mt-4 overflow-hidden overflow-x-scroll">
                <TaskGrantList config={data.grant} />
            </div>
        </div>
    )
}

export { CreateTaskEvent }
