import { useEffect } from 'react'
import { Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { TRepoLayoutOutletContext } from '../RepoLayout'
import { EGoshError, splitByPath, useBlob, usePush } from 'react-gosh'
import { toast } from 'react-toastify'
import Spinner from '../../components/Spinner'
import { Buffer } from 'buffer'
import ToastError from '../../components/Error/ToastError'
import BlobCommitForm from '../../components/Commit/BlobCommitForm'

const BlobUpdatePage = () => {
    const treepath = useParams()['*']
    const navigate = useNavigate()
    const { daoName, repoName, branchName = 'main' } = useParams()
    const { dao, repo } = useOutletContext<TRepoLayoutOutletContext>()
    const blob = useBlob(daoName!, repoName!, branchName, treepath)
    const { push, progress: pushProgress } = usePush(dao.details, repo, branchName)

    const urlBack = `/o/${daoName}/r/${repoName}/blobs/view/${branchName}${
        treepath && `/${treepath}`
    }`

    const onPush = async (values: any) => {
        try {
            const { name, title, message, tags, content } = values
            const [path] = splitByPath(treepath!)
            const blobUpd = {
                treepath: `${path ? `${path}/` : ''}${name}`,
                original: blob?.content ?? '',
                modified: content,
            }
            await push(title, [blobUpd], message, tags)
            navigate(urlBack)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    useEffect(() => {
        if (Buffer.isBuffer(blob.content)) {
            toast.error(EGoshError.FILE_BINARY)
            navigate(urlBack)
        }
    }, [blob.content, navigate, urlBack])

    if (!dao.details.isAuthMember) return <Navigate to={urlBack} />
    return (
        <div className="bordered-block py-8">
            <div className="px-4 sm:px-7">
                {!blob.isFetching && blob.content === undefined && (
                    <div className="text-gray-606060 text-sm">File not found</div>
                )}
                {blob.isFetching && (
                    <div className="text-gray-606060 text-sm">
                        <Spinner className="mr-3" />
                        Loading file...
                    </div>
                )}
            </div>

            {blob.path && !blob.isFetching && (
                <BlobCommitForm
                    dao={daoName!}
                    repo={repoName!}
                    branch={branchName}
                    treepath={splitByPath(treepath!)[0]}
                    initialValues={{
                        name: splitByPath(blob.path)[1],
                        content: blob.content ? blob.content.toString() : '',
                        title: '',
                    }}
                    urlBack={urlBack}
                    progress={pushProgress}
                    onSubmit={onPush}
                />
            )}
        </div>
    )
}

export default BlobUpdatePage
