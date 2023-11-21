import { faFloppyDisk, faPencil, faTrash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Buffer } from 'buffer'
import { useBlob, useBranches } from 'react-gosh'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { CodeComments } from '../../../components/Blob/Comments'
import BlobPreview from '../../../components/Blob/Preview'
import CopyClipboard from '../../../components/CopyClipboard'
import FileDownload from '../../../components/FileDownload'
import Loader from '../../../components/Loader'
import RepoBreadcrumbs from '../../../components/Repo/Breadcrumbs'
import { useDao, useDaoMember } from '../../hooks/dao.hooks'
import { useRepository } from '../../hooks/repository.hooks'

const BlobViewPage = () => {
    const treepath = useParams()['*']

    const { daoname, reponame, branch = 'main' } = useParams()
    const dao = useDao()
    const member = useDaoMember()
    const repository = useRepository()
    const { repository: _rg_repo, is_fetching } = useOutletContext<any>()
    const { branch: _rg_branch } = useBranches(_rg_repo.adapter, branch)
    const blob = useBlob(daoname!, reponame!, branch, treepath)
    const comments_on = !!dao.details.version && dao.details.version >= '5.0.0'

    if (is_fetching) {
        return <Loader>Loading...</Loader>
    }

    return (
        <div className="flex flex-wrap lg:flex-nowrap">
            <div className="grow">
                <div className="mb-5">
                    <RepoBreadcrumbs
                        daoName={dao.details.name}
                        repoName={repository.details?.name}
                        branchName={branch}
                        pathName={treepath}
                    />
                </div>

                <div className="border rounded-xl overflow-hidden">
                    {!blob.isFetching && blob.content === undefined && (
                        <div className="text-gray-7c8db5 text-sm p-5">File not found</div>
                    )}
                    {blob.isFetching && (
                        <Loader className="text-sm p-5">Loading file...</Loader>
                    )}
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
                                        {!_rg_branch?.isProtected && member.isMember && (
                                            <Link
                                                to={`/o/${daoname}/r/${reponame}/blobs/update/${branch}/${treepath}`}
                                                className="text-extblack/60 hover:text-extblack p-1 ml-2"
                                                test-id="link-blob-edit"
                                            >
                                                <FontAwesomeIcon
                                                    icon={faPencil}
                                                    size="sm"
                                                />
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

                                {!_rg_branch?.isProtected && member.isMember && (
                                    <Link
                                        to={`/o/${daoname}/r/${reponame}/blobs/delete/${branch}/${treepath}`}
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
                                commentsOn={comments_on}
                            />
                        </>
                    )}
                </div>
            </div>

            {blob.path && !blob.isFetching && comments_on && (
                <div className="pl-5">
                    <h3 className="text-gray-53596d text-lg mb-4">Comments</h3>
                    <div className="sticky top-3 shrink-0 w-72 bg-white">
                        <CodeComments filename={blob.path} multiple />
                    </div>
                </div>
            )}
        </div>
    )
}

export default BlobViewPage
