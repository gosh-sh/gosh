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
import Spinner from '../../components/Spinner'
import RepoBreadcrumbs from '../../components/Repo/Breadcrumbs'
import { Buffer } from 'buffer'
import FileDownload from '../../components/FileDownload'
import { BranchSelect } from '../../components/Branches'

const BlobPage = () => {
    const treepath = useParams()['*']

    const { daoName, repoName, branchName = 'main' } = useParams()
    const navigate = useNavigate()
    const { dao, repo } = useOutletContext<TRepoLayoutOutletContext>()
    const { branches, branch } = useBranches(repo, branchName)
    const blob = useBlob(daoName!, repoName!, branchName, treepath)

    return (
        <div className="bordered-block px-7 py-8">
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
                    <Link
                        to={`/o/${daoName}/r/${repoName}/find/${branchName}`}
                        className="btn btn--body px-4 py-1.5 text-sm !font-normal"
                    >
                        <FontAwesomeIcon icon={faMagnifyingGlass} />
                        <span className="hidden sm:inline-block ml-2">Go to file</span>
                    </Link>
                </div>
            </div>

            {!blob.isFetching && blob.content === undefined && (
                <div className="text-gray-606060 text-sm">File not found</div>
            )}
            {blob.isFetching && (
                <div className="text-gray-606060 text-sm">
                    <Spinner className="mr-3" />
                    Loading file...
                </div>
            )}
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
                                />
                                {!branch?.isProtected && dao.details.isAuthMember && (
                                    <Link
                                        to={`/o/${daoName}/r/${repoName}/blobs/update/${branchName}/${treepath}`}
                                        className="text-extblack/60 hover:text-extblack p-1 ml-2"
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
                            />
                        )}

                        {!branch?.isProtected && dao.details.isAuthMember && (
                            <Link
                                to={`/o/${daoName}/r/${repoName}/blobs/delete/${branchName}/${treepath}`}
                                className="text-rose-700/60 hover:text-rose-700 p-1 ml-2"
                            >
                                <FontAwesomeIcon icon={faTrash} size="sm" />
                            </Link>
                        )}
                    </div>
                    <BlobPreview filename={blob.path} value={blob.content} />
                </div>
            )}
        </div>
    )
}

export default BlobPage
