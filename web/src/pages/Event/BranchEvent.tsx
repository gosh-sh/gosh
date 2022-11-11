import { Link } from 'react-router-dom'
import { ESmvEventType, TSmvEvent } from 'react-gosh'

type TBranchEventProps = {
    daoName?: string
    event: TSmvEvent
}

const BranchEvent = (props: TBranchEventProps) => {
    const { daoName, event } = props
    const { data, status, type } = event

    return (
        <div>
            {status.completed && status.accepted && (
                <div className="bg-green-700 text-white mt-6 px-4 py-3 rounded">
                    <p>
                        Branch
                        <span className="font-semibold mx-1">
                            {data.repoName}:{data.branchName}
                        </span>
                        proposal was accepted by SMV
                    </p>
                    <p>
                        Check repository
                        <Link
                            className="mx-1 underline"
                            to={`/o/${daoName}/r/${data.repoName}/branches`}
                        >
                            branches
                        </Link>
                    </p>
                </div>
            )}

            <h4 className="mt-10 mb-3 text-lg font-semibold">Event details</h4>
            <div>
                {type.kind === ESmvEventType.BRANCH_LOCK && 'Add'}
                {type.kind === ESmvEventType.BRANCH_UNLOCK && 'Remove'}
                <span className="mx-1">SMV branch protection for</span>
                <span className="font-semibold mx-1">
                    {data.repoName}:{data.branchName}
                </span>
            </div>
        </div>
    )
}

export default BranchEvent
