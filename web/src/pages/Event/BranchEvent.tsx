import { Link } from 'react-router-dom';
import { EEventType, TGoshEventDetails } from '../../types/types';

type TBranchEventProps = {
    daoName?: string;
    details: TGoshEventDetails;
};

const BranchEvent = (props: TBranchEventProps) => {
    const { daoName, details } = props;
    const { params, status } = details;

    return (
        <div>
            {status.completed && status.accepted && (
                <div className="bg-green-700 text-white mt-6 px-4 py-3 rounded">
                    <p>
                        Branch
                        <span className="font-semibold mx-1">
                            {params.repoName}:{params.branchName}
                        </span>
                        proposal was accepted by SMV
                    </p>
                    <p>
                        Check repository
                        <Link
                            className="mx-1 underline"
                            to={`/${daoName}/${params.repoName}/branches`}
                        >
                            branches
                        </Link>
                    </p>
                </div>
            )}

            <h4 className="mt-10 mb-3 text-lg font-semibold">Event details</h4>
            <div>
                {params.proposalKind === EEventType.BRANCH_LOCK && 'Add'}
                {params.proposalKind === EEventType.BRANCH_UNLOCK && 'Remove'}
                <span className="mx-1">SMV branch protection for</span>
                <span className="font-semibold mx-1">
                    {params.repoName}:{params.branchName}
                </span>
            </div>
        </div>
    );
};

export default BranchEvent;
