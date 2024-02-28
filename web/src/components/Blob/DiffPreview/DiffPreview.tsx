import { Buffer } from 'buffer'
import * as Diff from 'diff'
import * as Diff2Html from 'diff2html'
import { useEffect, useMemo, useState } from 'react'
import { TCommit } from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import { useBlobComments } from '../../../hooks/codecomment.hooks'
import { Button } from '../../Form'
import { CodeComments } from '../Comments'
import LinesBlock from './LinesBlock'

type TBlobDiffPreviewProps = {
  dao: IGoshDaoAdapter
  isAuthMember?: boolean
  className?: string
  filename?: string
  original?: string | Buffer
  modified?: string | Buffer
  isDiffLoaded?: boolean
  isDiffFetching?: boolean
  commentsOn?: boolean
  commentsObject?: string
  snapshotAddress?: string
  commit?: TCommit

  getDiff(): void
}

const BlobDiffPreview = (props: TBlobDiffPreviewProps) => {
  const {
    dao,
    isAuthMember,
    filename = 'unknown',
    original = '',
    modified = '',
    isDiffLoaded = false,
    isDiffFetching = false,
    commentsOn,
    commentsObject,
    snapshotAddress,
    commit,
    getDiff,
  } = props
  const { getThreads } = useBlobComments({
    dao,
    objectAddress: commentsObject,
    filename,
    commits:
      commit && commit.parents.length ? [commit.parents[0].name, commit.name] : undefined,
  })
  const [isDiffShort, setIsDiffShort] = useState<boolean>(true)
  const [mouseDown, setMouseDown] = useState<boolean>(false)

  const onDiffToggle = () => {
    setIsDiffShort(!isDiffShort)
  }

  const isBuffer = useMemo(() => {
    return Buffer.isBuffer(original) || Buffer.isBuffer(modified)
  }, [original, modified])

  const diff = useMemo(() => {
    if (isBuffer) {
      return []
    }

    const patch = Diff.createPatch(
      filename,
      original as string,
      modified as string,
      undefined,
      undefined,
      {
        context: isDiffShort ? 5 : 20000,
      },
    )
    const _diff = Diff2Html.parse(patch)
    const _blocks = []
    for (const item of _diff) {
      _blocks.push(...item.blocks)
    }
    return _blocks
  }, [filename, original, modified, isDiffShort])

  useEffect(() => {
    if (commentsOn && isDiffLoaded) {
      getThreads()
    }
  }, [commentsOn, isDiffLoaded])

  return (
    <div className="flex flex-wrap xl:flex-nowrap items-start gap-y-4">
      <div className="grow border border-gray-e6edff rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1 border-b border-b-gray-e6edff bg-gray-fafafd">
          <div className="text-xs">{filename}</div>
          {isDiffLoaded && (
            <div>
              <Button
                variant="custom"
                className="text-xs underline underline-offset-2 decoration-1 decoration-dashed !px-0 !py-1"
                onClick={onDiffToggle}
              >
                {isDiffShort ? 'Expand' : 'Collapse'}
              </Button>
            </div>
          )}
        </div>
        <div className="text-xs overflow-x-scroll">
          {isBuffer && <div className="text-center py-3">Binary data not shown</div>}
          {isDiffLoaded && !diff.length && (
            <div className="text-center py-3">File without changes</div>
          )}
          {!isDiffLoaded && (
            <div className="text-center py-3">
              <Button
                variant="custom"
                disabled={isDiffFetching}
                isLoading={isDiffFetching}
                onClick={getDiff}
              >
                Load diff
              </Button>
            </div>
          )}
          <table className="w-full" onMouseLeave={() => setMouseDown(false)}>
            <tbody>
              {diff.map((block, i) => (
                <LinesBlock
                  key={i}
                  dao={dao}
                  isAuthMember={isAuthMember}
                  filename={filename}
                  commit={commit}
                  block={block}
                  commentsObject={commentsObject}
                  snapshotAddress={snapshotAddress}
                  commentsOn={commentsOn}
                  mouseDown={mouseDown}
                  setMouseDown={setMouseDown}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {commentsOn && (
        <div className="sticky top-3 shrink-0 w-72 bg-white pl-3">
          <CodeComments filename={filename} />
        </div>
      )}
    </div>
  )
}

export default BlobDiffPreview
