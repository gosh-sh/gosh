import { useMemo } from 'react'
import { classNames, getTreeItemFullPath, TTreeItem, useBlob } from 'react-gosh'
import BlobPreview from '../../components/Blob/Preview'

type TRepoReadmeProps = {
  className?: string
  dao: string
  repo: string
  branch: string
  blobs: TTreeItem[]
}

const RepoReadme = (props: TRepoReadmeProps) => {
  const { className, dao, repo, branch, blobs } = props
  const readmePath = useMemo(() => {
    const item = blobs.find((item) => item.name.toLowerCase() === 'readme.md')
    return item ? getTreeItemFullPath(item) : undefined
  }, [blobs])
  const { isFetching, path, content } = useBlob(dao, repo, branch, readmePath)

  if (!isFetching && !content) return null
  return (
    <div className={classNames(className)}>
      {!isFetching && <BlobPreview filename={path} value={content} />}
    </div>
  )
}

export default RepoReadme
