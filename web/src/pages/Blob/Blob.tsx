import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { TRepoLayoutOutletContext } from '../RepoLayout'
import { useBlob, useBranches } from 'react-gosh'
import BlobPreview from '../../components/Blob/Preview'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faMagnifyingGlass,
    faPencil,
    faFloppyDisk,
    faTrash,
} from '@fortawesome/free-solid-svg-icons'
import CopyClipboard from '../../components/CopyClipboard'
import RepoBreadcrumbs from '../../components/Repo/Breadcrumbs'
import { Buffer } from 'buffer'
import FileDownload from '../../components/FileDownload'
import { BranchSelect } from '../../components/Branches'
import { ButtonLink } from '../../components/Form'
import Loader from '../../components/Loader'

const BlobPage = () => {
    const treepath = useParams()['*']

    const { daoName, repoName, branchName = 'main' } = useParams()
    const navigate = useNavigate()
    const { dao, repository } = useOutletContext<TRepoLayoutOutletContext>()
    const { branches, branch } = useBranches(repository.adapter, branchName)
    const blob = useBlob(daoName!, repoName!, branchName, treepath)

    return (
        <>
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

            {!blob.isFetching && blob.content === undefined && (
                <div className="text-gray-7c8db5 text-sm">File not found</div>
            )}
            {blob.isFetching && <Loader className="text-sm">Loading file...</Loader>}
            {blob.path && !blob.isFetching && (
                <div className="border rounded overflow-hidden">
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
                    <BlobPreview filename={blob.path} value={blob.content} />
                </div>
            )}
        </>
    )
}

export default BlobPage
