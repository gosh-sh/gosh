import { ESmvEventType, TSmvEvent } from 'react-gosh'

type TRepoBranchEventProps = {
    event: TSmvEvent
}

const RepoBranchEvent = (props: TRepoBranchEventProps) => {
    const { event } = props
    const { data, type } = event

    return (
        <div>
            <div className="text-gray-7c8db5 text-sm">
                {type.kind === ESmvEventType.BRANCH_LOCK
                    ? 'Make repository branch protected'
                    : 'Remove protection from repository branch'}
            </div>
            <div className="flex gap-3 text-gray-7c8db5 text-sm">
                <div>Repository:</div>
                <div>{data.repoName}</div>
            </div>
            <div className="flex gap-3 text-gray-7c8db5 text-sm">
                <div>Branch:</div>
                <div>{data.branchName}</div>
            </div>
        </div>
    )
}

export { RepoBranchEvent }
