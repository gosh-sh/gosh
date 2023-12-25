import { faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { classNames } from 'react-gosh'
import { TBranch, TBranchCompareProgress } from 'react-gosh/dist/types/repo.types'
import BlobDiffPreview from '../Blob/DiffPreview'
import { BranchCompareProgress } from './CompareProgress'

type TBranchComparePreviewProps = {
  className?: string
  srcBranch?: TBranch
  dstBranch?: TBranch
  progress: {
    isFetching: boolean
    isEmpty: boolean
    details: TBranchCompareProgress
    items: {
      treepath: string[]
      original: string | Buffer
      modified: string | Buffer
      showDiff: boolean
    }[]
    getDiff(i: number): void
  }
}

const BranchComparePreview = (props: TBranchComparePreviewProps) => {
  const { className, srcBranch, dstBranch, progress } = props
  const { isEmpty, isFetching, details, items, getDiff } = progress

  return (
    <div className={classNames(className)}>
      {isFetching && <BranchCompareProgress {...details} />}

      {isEmpty && (
        <div className="text-sm text-gray-606060 text-center">
          There is nothing to merge
        </div>
      )}

      {!isFetching && !isEmpty && (
        <>
          <div className="text-lg">
            Merge branch
            <span className="font-semibold mx-2">{srcBranch?.name}</span>
            <FontAwesomeIcon icon={faArrowRight} size="sm" />
            <span className="font-semibold ml-2">{dstBranch?.name}</span>
          </div>

          {items.map(({ treepath, original, modified, showDiff }, index) => {
            return (
              <div key={index} className="my-5">
                <BlobDiffPreview
                  commentsOn={false}
                  commit={dstBranch!.commit}
                  address=""
                  filename={treepath.find((value) => !!value)}
                  original={original}
                  modified={modified}
                  isDiffLoaded={showDiff}
                  getDiff={() => getDiff(index)}
                />
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

export { BranchComparePreview }
