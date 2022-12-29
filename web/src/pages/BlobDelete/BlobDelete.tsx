import { Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { TRepoLayoutOutletContext } from '../RepoLayout'
import { useBlob, usePush } from 'react-gosh'
import { toast } from 'react-toastify'
import Spinner from '../../components/Spinner'
import ToastError from '../../components/Error/ToastError'
import BlobDeleteForm from '../../components/Commit/BlobDeleteForm'

const BlobDeletePage = () => {
    const treepath = useParams()['*']
    const navigate = useNavigate()
    const { daoName, repoName, branchName = 'main' } = useParams()
    const { dao, repository } = useOutletContext<TRepoLayoutOutletContext>()
    const blob = useBlob(daoName!, repoName!, branchName, treepath)
    const { push, progress: pushProgress } = usePush(
        dao.details,
        repository.adapter,
        branchName,
    )

    const urlBack = `/o/${daoName}/r/${repoName}/blobs/view/${branchName}${
        treepath && `/${treepath}`
    }`

    const onPush = async (values: any) => {
        try {
            const { title, message, tags } = values
            const blobDel = {
                treepath: [treepath!, ''],
                original: blob?.content ?? '',
                modified: '',
            }
            await push(title, [blobDel], message, tags)
            navigate(`/o/${daoName}/r/${repoName}/tree/${branchName}`)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

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
                <BlobDeleteForm
                    dao={daoName!}
                    repo={repoName!}
                    branch={branchName}
                    treepath={treepath!}
                    content={blob.content}
                    initialValues={{
                        title: `Delete ${treepath}`,
                    }}
                    urlBack={urlBack}
                    progress={pushProgress}
                    onSubmit={onPush}
                />
            )}
        </div>
    )
}

export default BlobDeletePage
