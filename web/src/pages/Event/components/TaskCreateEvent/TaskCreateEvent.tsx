import { SYSTEM_TAG } from 'react-gosh'
import { TaskGrantList } from '../../../../components/Task/GrantList'

type TTaskCreateEventProps = {
    data: any
}

const TaskCreateEvent = (props: TTaskCreateEventProps) => {
    const { data } = props

    return (
        <div className="flex flex-col gap-y-1">
            <div className="flex gap-3 text-gray-7c8db5 text-sm">
                <div>Task name:</div>
                <div>{data.taskname}</div>
            </div>
            <div className="flex gap-3 text-gray-7c8db5 text-sm">
                <div>Repository name:</div>
                <div>{data.reponame}</div>
            </div>
            <div className="flex gap-3 text-gray-7c8db5 text-sm">
                <div>Tags:</div>
                <div>
                    {data.tag.filter((tag: string) => tag !== SYSTEM_TAG).join(', ') ||
                        '-'}
                </div>
            </div>
            <div className="flex gap-3 text-gray-7c8db5 text-sm">
                <div>Assigners total:</div>
                <div>
                    {data.grant.assign
                        .reduce((_sum: number, item: any) => {
                            return _sum + parseInt(item.grant)
                        }, 0)
                        .toLocaleString()}
                </div>
            </div>
            <div className="flex gap-3 text-gray-7c8db5 text-sm">
                <div>Managers total:</div>
                <div>
                    {data.grant.manager
                        .reduce((_sum: number, item: any) => {
                            return _sum + parseInt(item.grant)
                        }, 0)
                        .toLocaleString()}
                </div>
            </div>
            <div className="flex gap-3 text-gray-7c8db5 text-sm">
                <div>Reviewers total:</div>
                <div>
                    {data.grant.review
                        .reduce((_sum: number, item: any) => {
                            return _sum + parseInt(item.grant)
                        }, 0)
                        .toLocaleString()}
                </div>
            </div>
            <div className="mt-4 overflow-hidden overflow-x-scroll">
                <TaskGrantList config={data.grant} />
            </div>
        </div>
    )
}

export { TaskCreateEvent }
