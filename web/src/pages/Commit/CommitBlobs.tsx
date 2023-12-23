import Spinner from '../../components/Spinner'
import BlobDiffPreview from '../../components/Blob/DiffPreview'
import { TCommit } from 'react-gosh'

type TCommitBlobsType = {
  className?: string
  blobs: {
    isFetching: boolean
    items: {
      treepath: string
      commit: TCommit
      current: string | Buffer
      previous: string | Buffer
      showDiff: boolean
      isFetching: boolean
    }[]
    getDiff(index: number): void
  }
}

const CommitBlobs = (props: TCommitBlobsType) => {
  const { className, blobs } = props
  const { isFetching, items, getDiff } = blobs

  return (
    <div className={className}>
      {isFetching && (
        <div className="text-gray-606060 text-sm">
          <Spinner className="mr-3" />
          Loading commit diff...
        </div>
      )}

      {items.map(({ treepath, showDiff, current, previous, isFetching }, index) => (
        <div key={index} className="my-5">
          <BlobDiffPreview
            filename={treepath}
            modified={current}
            original={previous}
            isDiffLoaded={showDiff}
            isDiffFetching={isFetching}
            getDiff={() => getDiff(index)}
          />
        </div>
      ))}
    </div>
  )
}

export default CommitBlobs
