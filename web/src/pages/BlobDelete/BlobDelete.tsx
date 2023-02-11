import { Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { TRepoLayoutOutletContext } from '../RepoLayout'
import { useBlob, usePush } from 'react-gosh'
import { toast } from 'react-toastify'
import ToastError from '../../components/Error/ToastError'
import Loader from '../../components/Loader'
import { BlobDeleteForm, TBlobDeleteFormValues } from '../../components/Commit'

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

    const onPush = async (values: TBlobDeleteFormValues) => {
        try {
            const { title, message, tags, isPullRequest } = values
            const blobObject = {
                treepath: [treepath!, ''],
                original: blob?.content ?? '',
                modified: '',
            }
            const task = values.task
                ? {
                      task: values.task,
                      assigners: [],
                      reviewers: values.reviewers?.split(' ') || [],
                      manager: values.manager || '',
                  }
                : undefined
            await push(title, [blobObject], { message, tags, task, isPullRequest })
            if (isPullRequest) {
                navigate(`/o/${daoName}/events`, { replace: true })
            } else {
                navigate(`/o/${daoName}/r/${repoName}/tree/${branchName}`)
            }
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    if (!dao.details.isAuthMember) {
        return <Navigate to={urlBack} />
    }
    return (
        <>
            <div>
                {!blob.isFetching && blob.content === undefined && (
                    <div className="text-gray-7c8db5 text-sm">File not found</div>
                )}
                {blob.isFetching && <Loader className="text-sm">Loading file...</Loader>}
            </div>

            {blob.path && !blob.isFetching && (
                <BlobDeleteForm
                    dao={dao}
                    repository={repository}
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
        </>
    )
}

export default BlobDeletePage
