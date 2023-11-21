import { usePush } from 'react-gosh'
import { Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { BlobCommitForm, TBlobCommitFormValues } from '../../../components/Commit'
import Loader from '../../../components/Loader'
import { ToastError } from '../../../components/Toast'

const BlobCreatePage = () => {
    const treepath = useParams()['*']
    const navigate = useNavigate()
    const { daoname, reponame, branch = 'main' } = useParams()
    const { dao, repository, is_fetching } = useOutletContext<any>()
    const { push, progress: pushProgress } = usePush(
        dao.details,
        repository.adapter,
        branch,
    )

    const urlBack = `/o/${daoname}/r/${reponame}/tree/${branch}/${treepath}`

    const onPush = async (values: TBlobCommitFormValues) => {
        try {
            const { name, content, title, message, tags, isPullRequest } = values
            const blobObject = {
                treepath: ['', `${treepath ? `${treepath}/` : ''}${name}`],
                original: '',
                modified: content,
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
                isPullRequest,
                message,
                tags,
                task,
            })
            if (isPullRequest) {
                navigate(`/o/${daoname}/events/${eventaddr || ''}`, { replace: true })
            } else {
                navigate(urlBack)
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
        <div>
            <BlobCommitForm
                dao={dao}
                repository={repository}
                branch={branch}
                treepath={treepath!}
                initialValues={{
                    name: '',
                    title: '',
                    content: '',
                }}
                urlBack={urlBack}
                progress={pushProgress}
                onSubmit={onPush}
            />
        </div>
    )
}

export default BlobCreatePage
