import { useBlob, usePush } from 'react-gosh'
import { Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { BlobDeleteForm, TBlobDeleteFormValues } from '../../../components/Commit'
import Loader from '../../../components/Loader'
import { ToastError } from '../../../components/Toast'

const BlobDeletePage = () => {
    const treepath = useParams()['*']
    const navigate = useNavigate()
    const { daoname, reponame, branch = 'main' } = useParams()
    const { dao, repository, is_fetching } = useOutletContext<any>()
    const blob = useBlob(daoname!, reponame!, branch, treepath)
    const { push, progress: pushProgress } = usePush(
        dao.details,
        repository.adapter,
        branch,
    )

    const urlBack = `/o/${daoname}/r/${reponame}/blobs/view/${branch}${
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

            let task
            if (values.task) {
                const assigners = !values.assigners
                    ? []
                    : typeof values.assigners === 'string'
                    ? values.assigners.split(' ')
                    : values.assigners
                const reviewers = !values.reviewers
                    ? []
                    : typeof values.reviewers === 'string'
                    ? values.reviewers.split(' ')
                    : values.reviewers
                const managers = !values.managers
                    ? []
                    : typeof values.managers === 'string'
                    ? values.managers.split(' ')
                    : values.managers
                task = { task: values.task, assigners, reviewers, managers }
            }

            const eventaddr = await push(title, [blobObject], {
                message,
                tags,
                task,
                isPullRequest,
            })
            if (isPullRequest) {
                navigate(`/o/${daoname}/events/${eventaddr || ''}`, { replace: true })
            } else {
                navigate(`/o/${daoname}/r/${reponame}/tree/${branch}`)
            }
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    if (is_fetching) {
        return <Loader>Loading...</Loader>
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
                    branch={branch}
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
