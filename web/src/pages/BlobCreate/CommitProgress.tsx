import Spinner from '../../components/Spinner';
import { TCreateCommitCallbackParams } from '../../types/types';

const Result = (props: any) => {
    return <span className="mr-3">{!props.flag ? <Spinner size="sm" /> : 'OK'}</span>;
};

const CommitProgress = (props: TCreateCommitCallbackParams) => {
    const {
        diffsPrepare,
        treePrepare,
        treeDeploy,
        treeSet,
        commitDeploy,
        tagsDeploy,
        completed,
    } = props;
    return (
        <div className="text-sm text-gray-050a15/70 bg-gray-050a15/5 rounded p-3">
            <code className="flex flex-col gap-2">
                <div>
                    <Result flag={diffsPrepare} />
                    Prepare diffs...
                </div>
                <div>
                    <Result flag={treePrepare} />
                    Build updated tree...
                </div>
                <div>
                    <Result flag={treeDeploy} />
                    Deploy trees...
                </div>
                <div>
                    <Result flag={commitDeploy} />
                    Deploy commit...
                </div>
                <div>
                    <Result flag={tagsDeploy} />
                    Deploy tags...
                </div>
                <div>
                    <Result flag={treeSet} />
                    Update commit tree...
                </div>
                <div>
                    <Result flag={completed} />
                    Create proposal or wait for commit...
                </div>
            </code>
        </div>
    );
};

export default CommitProgress;
