import { Link, useOutletContext, useParams } from 'react-router-dom'
import { getCommitTime, useCommit } from 'react-gosh'
import CopyClipboard from '../../components/CopyClipboard'
import { shortString } from 'react-gosh'
import CommitBlobs from './CommitBlobs'
import { Commiter } from '../../components/Commit'
import Loader from '../../components/Loader'
import { TRepoLayoutOutletContext } from '../RepoLayout'

const CommitPage = () => {
  const { daoName, repoName, branchName, commitName } = useParams()
  const { dao } = useOutletContext<TRepoLayoutOutletContext>()
  const { isFetching, commit, blobs } = useCommit(
    daoName!,
    repoName!,
    branchName!,
    commitName!,
  )

  return (
    <>
      {isFetching && <Loader className="text-sm">Loading commit...</Loader>}

      {!isFetching && commit && (
        <>
          <div>
            <div className="font-medium py-2">{commit.title}</div>

            {commit.message && (
              <pre className="mb-3 text-gray-53596d text-sm">{commit.message}</pre>
            )}

            <div className="flex flex-wrap border-t gap-x-6 py-1 text-gray-7c8db5 text-xs">
              <div className="flex items-center">
                <span className="mr-2 text-gray-7c8db5">Commit by</span>
                <Commiter committer={commit.committer} />
              </div>
              <div>
                <span className="mr-2 text-gray-7c8db5">at</span>
                {getCommitTime(commit.committer).toLocaleString()}
              </div>
              <div className="grow flex items-center justify-start sm:justify-end">
                <span className="mr-2 text-gray-7c8db5">commit</span>
                <CopyClipboard
                  label={shortString(commit.name, 10, 10)}
                  componentProps={{
                    text: commit.name,
                  }}
                />
              </div>
            </div>
          </div>

          {dao.details.version < '6.0.0' && branchName !== commit.branch ? (
            <div className="mt-5 bg-blue-300 rounded-xl px-4 py-2.5">
              <p>This commit is from another branch</p>
              <p className="text-sm">
                Please, follow this{' '}
                <Link
                  className="font-bold underline"
                  to={`/o/${daoName}/r/${repoName}/commits/${commit.branch}/${commit.name}`}
                >
                  link
                </Link>{' '}
                to get commit details
              </p>
            </div>
          ) : (
            <CommitBlobs blobs={blobs} className="mt-4" />
          )}
        </>
      )}
    </>
  )
}

export default CommitPage
