import { ESmvEventType } from 'react-gosh'

type TRepoBranchEventProps = {
    type: {
        kind: number
        name: string
    }
    data: any
}

const RepoBranchEvent = (props: TRepoBranchEventProps) => {
    const { data, type } = props

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
