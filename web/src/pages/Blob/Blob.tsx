import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import BranchSelect from '../../components/BranchSelect'
import { TRepoLayoutOutletContext } from '../RepoLayout'
import { useMonaco } from '@monaco-editor/react'
import { getCodeLanguageFromFilename } from '../../helpers'
import BlobPreview from '../../components/Blob/Preview'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faMagnifyingGlass,
    faPencil,
    faFloppyDisk,
} from '@fortawesome/free-solid-svg-icons'
import CopyClipboard from '../../components/CopyClipboard'
import Spinner from '../../components/Spinner'
import RepoBreadcrumbs from '../../components/Repo/Breadcrumbs'
import { useGoshBlob, useGoshRepoBranches } from '../../hooks/gosh.hooks'
import { Buffer } from 'buffer'
import FileDownload from '../../components/FileDownload'

const BlobPage = () => {
    const treePath = useParams()['*']

    const { daoName, repoName, branchName = 'main' } = useParams()
    const navigate = useNavigate()
    const { wallet, repo } = useOutletContext<TRepoLayoutOutletContext>()
    const monaco = useMonaco()
    const { branches, branch } = useGoshRepoBranches(repo, branchName)
    const { blob } = useGoshBlob(repo, branchName, treePath)

    return (
        <div className="bordered-block px-7 py-8">
            <div className="flex flex-wrap items-center gap-3 mb-5">
                <BranchSelect
                    branch={branch}
                    branches={branches}
                    onChange={(selected) => {
                        if (selected) {
                            navigate(
                                `/${daoName}/${repoName}/blobs/${selected.name}/${treePath}`,
                            )
                        }
                    }}
                />
                <div>
                    <RepoBreadcrumbs
                        daoName={daoName}
                        repoName={repoName}
                        branchName={branchName}
                        pathName={treePath}
                    />
                </div>
                <div className="grow text-right">
                    <Link
                        to={`/${daoName}/${repoName}/find/${branchName}`}
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
            {monaco && blob.path && blob.content && (
                <div className="border rounded overflow-hidden">
                    <div className="flex bg-gray-100 px-3 py-1 border-b justify-end">
                        {!Buffer.isBuffer(blob.content) ? (
                            <>
                                <CopyClipboard
                                    componentProps={{
                                        text: blob.content,
                                    }}
                                    iconContainerClassName="text-extblack/60 hover:text-extblack p-1"
                                    iconProps={{
                                        size: 'sm',
                                    }}
                                />
                                {!branch?.isProtected && wallet?.isDaoParticipant && (
                                    <Link
                                        to={`/${daoName}/${repoName}/blobs/update/${branchName}/${treePath}`}
                                        className="text-extblack/60 hover:text-extblack p-1 ml-2"
                                    >
                                        <FontAwesomeIcon icon={faPencil} size="sm" />
                                    </Link>
                                )}
                            </>
                        ) : (
                            <FileDownload
                                name={treePath}
                                content={blob.content}
                                label={<FontAwesomeIcon icon={faFloppyDisk} />}
                            />
                        )}
                    </div>
                    <BlobPreview
                        language={getCodeLanguageFromFilename(monaco, blob.path)}
                        value={blob.content}
                    />
                </div>
            )}
        </div>
    )
}

export default BlobPage
