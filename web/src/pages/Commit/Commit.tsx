import { useEffect, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { IGoshRepository, TGoshCommit } from 'web-common/lib/types/types';
import { TRepoLayoutOutletContext } from '../RepoLayout';
import { getCommit, getCommitTime } from 'web-common/lib/helpers';
import CopyClipboard from '../../components/CopyClipboard';
import { shortString } from 'web-common/lib/utils';
import Spinner from '../../components/Spinner';
import CommitBlobs from './CommitBlobs';
import { useGoshRepoBranches } from 'web-common/lib/hooks/gosh.hooks';

const CommitPage = () => {
    const { goshRepo } = useOutletContext<TRepoLayoutOutletContext>();
    const { daoName, repoName, branchName, commitName } = useParams();
    const { branch } = useGoshRepoBranches(goshRepo, branchName);
    const [commit, setCommit] = useState<TGoshCommit>();

    const renderCommitter = (committer: string) => {
        const [pubkey] = committer.split(' ');
        return (
            <CopyClipboard
                label={shortString(pubkey)}
                componentProps={{
                    text: pubkey,
                }}
            />
        );
    };

    useEffect(() => {
        const _getCommit = async (repo: IGoshRepository, name: string) => {
            // Get commit data
            const address = await repo.getCommitAddr(name);
            const commitData = await getCommit(repo, address);
            setCommit(commitData);
        };

        if (commitName) _getCommit(goshRepo, commitName);
    }, [goshRepo, commitName]);

    return (
        <div className="bordered-block px-7 py-8">
            {!commit && (
                <div className="text-gray-606060 text-sm">
                    <Spinner className="mr-3" />
                    Loading commit...
                </div>
            )}
            {commit && (
                <>
                    <div>
                        <div className="font-medium py-2">{commit.content.title}</div>

                        {commit.content.message && (
                            <pre className="mb-3 text-gray-050a15/65 text-sm">
                                {commit.content.message}
                            </pre>
                        )}

                        <div className="flex flex-wrap border-t gap-x-6 py-1 text-gray-050a15/75 text-xs">
                            <div className="flex items-center">
                                <span className="mr-2 text-gray-050a15/65">
                                    Commit by
                                </span>
                                {renderCommitter(commit.content.committer || '')}
                            </div>
                            <div>
                                <span className="mr-2 text-gray-050a15/65">at</span>
                                {getCommitTime(
                                    commit.content.committer || ''
                                ).toLocaleString()}
                            </div>
                            <div className="grow flex items-center justify-start sm:justify-end">
                                <span className="mr-2 text-gray-050a15/65">commit</span>
                                <CopyClipboard
                                    label={shortString(commit.name ?? '', 10, 10)}
                                    componentProps={{
                                        text: commit.name ?? '',
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {branch && commit.branch !== branch.name && (
                        <div className="mt-4">
                            <p className="text-sm">
                                This commit was created in branch <b>{commit.branch}</b>
                            </p>
                            <p className="text-sm">
                                To see the commit diff follow this
                                <Link
                                    to={`/${daoName}/${repoName}/commits/${commit.branch}/${commit.name}`}
                                    className="ml-1 underline"
                                >
                                    link
                                </Link>
                            </p>
                        </div>
                    )}

                    {branch && commit.branch === branch.name && (
                        <CommitBlobs
                            repo={goshRepo}
                            branch={branch.name}
                            commit={commit.name}
                            className="mt-4"
                        />
                    )}
                </>
            )}
        </div>
    );
};

export default CommitPage;
