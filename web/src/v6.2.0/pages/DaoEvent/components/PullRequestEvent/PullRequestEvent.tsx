import { getCommitTime, usePullRequestCommit } from 'react-gosh'
import { Link, useParams } from 'react-router-dom'
import BlobDiffPreview from '../../../../../components/Blob/DiffPreview'
import { Commiter } from '../../../../../components/Commit'
import CopyClipboard from '../../../../../components/CopyClipboard'
import Loader from '../../../../../components/Loader'
import { shortString } from '../../../../../utils'
import { lockToStr } from '../../../../components/Task'
import { useDao, useDaoMember } from '../../../../hooks/dao.hooks'

type TPullRequestEventProps = {
  data: { branchName: string; repoName: string; commit: string; task: any }
}

const PullRequestEvent = (props: TPullRequestEventProps) => {
  const { data } = props
  const urlparams = useParams()
  const dao = useDao()
  const member = useDaoMember()
  const { isFetching, commit, blobs } = usePullRequestCommit(
    dao.details.name!,
    data.repoName,
    data.commit,
  )

  return (
    <div>
      <div className="flex flex-col gap-2 py-3">
        <div className="flex items-center gap-6">
          <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
            Repository
          </div>
          <div className="text-sm">
            <Link
              to={`/o/${dao.details.name}/r/${data.repoName}/branches`}
              className="text-blue-2b89ff"
            >
              {data.repoName}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">Branch</div>
          <div className="text-sm">{data.branchName}</div>
        </div>
        {!isFetching && commit && (
          <>
            <div className="flex items-center gap-6">
              <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                Commit
              </div>
              <div className="text-sm">
                <CopyClipboard
                  label={shortString(commit.name, 7, 0, '')}
                  componentProps={{
                    text: commit.name,
                  }}
                />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                Commit at
              </div>
              <div className="text-sm">
                {getCommitTime(commit.committer).toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                Commit by
              </div>
              <div className="text-sm">
                <Commiter committer={commit.committer} />
              </div>
            </div>
          </>
        )}

        {data.task && (
          <>
            <div className="flex items-center gap-6">
              <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                Milestone/Task
              </div>
              <div className="text-sm">
                {data.task.milestone_name ? (
                  <Link
                    to={`/o/${dao.details.name}/tasks/milestone/${data.task.milestone_address}?subtask=${data.task.address}`}
                    className="block text-blue-2b89ff max-w-sm truncate text-ellipsis"
                  >
                    {data.task.name} Community Management & SMM:Creating and customizing
                    accounts
                  </Link>
                ) : (
                  <Link
                    to={`/o/${dao.details.name}/tasks/${data.task.address}`}
                    className="block text-blue-2b89ff max-w-sm truncate text-ellipsis"
                  >
                    {data.task.name}
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                Vesting
              </div>
              <div className="text-sm">{lockToStr(data.task.vestingEnd)}</div>
            </div>
            <div className="flex items-center gap-6">
              <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                Reward
              </div>
              <div className="text-sm">{data.task.balance.toLocaleString()}</div>
            </div>
          </>
        )}
      </div>

      <h4 className="mt-10 mb-3 text-lg font-medium">Pull request diff</h4>
      {blobs.isFetching && <Loader className="text-sm">Loading commit diff...</Loader>}

      {blobs.items.map(({ item, current, previous, showDiff, isFetching }, index) => (
        <div key={index} className="my-5 relative">
          <BlobDiffPreview
            dao={dao.details._adapter!}
            commentsOn={dao.details.version! >= '5.0.0'}
            filename={item.treepath}
            modified={current}
            original={previous}
            commit={commit!}
            commentsObject={urlparams.address}
            snapshotAddress={item.address}
            isDiffLoaded={showDiff}
            isDiffFetching={isFetching}
            isAuthMember={member.isMember}
            getDiff={() => blobs.getDiff(index)}
          />
        </div>
      ))}
    </div>
  )
}

export { PullRequestEvent }
