import { SYSTEM_TAG } from 'react-gosh'

type TTaskCreateEventProps = {
    data: any
}

const lockToStr = (period: number): string => {
    const months = Math.floor(period / 2592000)
    const seconds = Math.floor(period % 2592000)
    return `${months} mo` + (seconds !== 0 ? `${seconds} s` : '')
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
                    {data.tag.filter((tag: string) => tag !== SYSTEM_TAG).join(', ')}
                </div>
            </div>
            <div className="mt-4 overflow-hidden overflow-x-scroll">
                <table className="w-full">
                    <thead className="text-gray-7c8db5 text-xs text-left">
                        <tr>
                            <th className="font-light px-2">Lock/Vesting</th>
                            <th className="font-light px-2">Assigners</th>
                            <th className="font-light px-2">Reviewers</th>
                            <th className="font-light px-2">Managers</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.grant.assign.map((assign: any, index: number) => {
                            const review = data.grant.review[index]
                            const manager = data.grant.manager[index]
                            return (
                                <tr key={index}>
                                    <td className="px-2">{lockToStr(assign.lock)}</td>
                                    <td className="px-2">{assign.grant}</td>
                                    <td className="px-2">{review.grant}</td>
                                    <td className="px-2">{manager.grant}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export { TaskCreateEvent }
