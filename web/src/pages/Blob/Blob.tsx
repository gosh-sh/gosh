import {
  faFloppyDisk,
  faMagnifyingGlass,
  faPencil,
  faTrash,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Buffer } from 'buffer'
import { useBlob, useBranches } from 'react-gosh'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import AiReview from '../../components/AiReview'
import { CodeComments } from '../../components/Blob/Comments'
import BlobPreview from '../../components/Blob/Preview'
import { BranchSelect } from '../../components/Branches'
import CopyClipboard from '../../components/CopyClipboard'
import FileDownload from '../../components/FileDownload'
import { ButtonLink } from '../../components/Form'
import Loader from '../../components/Loader'
import RepoBreadcrumbs from '../../components/Repo/Breadcrumbs'
import { TRepoLayoutOutletContext } from '../RepoLayout'

const BlobPage = () => {
  const treepath = useParams()['*']

  const { daoName, repoName, branchName = 'main' } = useParams()
  const navigate = useNavigate()
  const { dao, repository } = useOutletContext<TRepoLayoutOutletContext>()
  const { branches, branch } = useBranches(repository.adapter, branchName)
  const blob = useBlob(daoName!, repoName!, branchName, treepath)

  return (
    <div className="flex flex-wrap lg:flex-nowrap">
      <div className="grow">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <BranchSelect
            branch={branch}
            branches={branches}
            onChange={(selected) => {
              if (selected) {
                navigate(
                  `/o/${daoName}/r/${repoName}/blobs/view/${selected.name}/${treepath}`,
                )
              }
            }}
          />
          <div>
            <RepoBreadcrumbs
              daoName={daoName}
              repoName={repoName}
              branchName={branchName}
              pathName={treepath}
            />
          </div>
          <div className="grow text-right">
            <ButtonLink
              to={`/o/${daoName}/r/${repoName}/find/${branchName}`}
              test-id="link-goto-file"
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} />
              <span className="hidden sm:inline-block ml-2">Go to file</span>
            </ButtonLink>
          </div>
        </div>

        <div className="border rounded-xl overflow-hidden">
          {!blob.isFetching && blob.content === undefined && (
            <div className="text-gray-7c8db5 text-sm p-5">File not found</div>
          )}
          {blob.isFetching && <Loader className="text-sm p-5">Loading file...</Loader>}
          {blob.path && !blob.isFetching && (
            <>
              <div className="flex bg-gray-100 px-3 py-1 border-b justify-end items-center">
                {!Buffer.isBuffer(blob.content) ? (
                  <>
                    <CopyClipboard
                      componentProps={{
                        text: blob.content || '',
                      }}
                      iconContainerClassName="text-extblack/60 hover:text-extblack p-1"
                      iconProps={{
                        size: 'sm',
                      }}
                      testId="btn-blob-copy"
                    />
                    {!branch?.isProtected && dao.details.isAuthMember && (
                      <Link
                        to={`/o/${daoName}/r/${repoName}/blobs/update/${branchName}/${treepath}`}
                        className="text-extblack/60 hover:text-extblack p-1 ml-2"
                        test-id="link-blob-edit"
                      >
                        <FontAwesomeIcon icon={faPencil} size="sm" />
                      </Link>
                    )}
                  </>
                ) : (
                  <FileDownload
                    name={treepath}
                    content={blob.content}
                    label={<FontAwesomeIcon icon={faFloppyDisk} />}
                    test-id="btn-blob-download"
                  />
                )}

                {!branch?.isProtected && dao.details.isAuthMember && (
                  <Link
                    to={`/o/${daoName}/r/${repoName}/blobs/delete/${branchName}/${treepath}`}
                    className="text-rose-700/60 hover:text-rose-700 p-1 ml-2"
                    test-id="link-blob-delete"
                  >
                    <FontAwesomeIcon icon={faTrash} size="sm" />
                  </Link>
                )}
              </div>

              <BlobPreview
                address={blob.address}
                filename={blob.path}
                commit={blob.commit}
                value={blob.content}
                commentsOn={dao.details.version >= '5.0.0'}
              />
            </>
          )}
        </div>
      </div>

      {blob.path && !blob.isFetching && dao.details.version >= '5.0.0' && (
        <div className="pl-5">
          <h3 className="text-gray-53596d text-lg mb-4">Comments</h3>
          <div className="sticky top-3 shrink-0 w-72 bg-white">
            <AiReview dao={dao.details} className="mb-4" />
            <CodeComments filename={blob.path} multiple />
          </div>
        </div>
      )}
    </div>
  )
}

export default BlobPage
