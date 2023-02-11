import { Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { TRepoLayoutOutletContext } from '../RepoLayout'
import { usePush } from 'react-gosh'
import { toast } from 'react-toastify'
import ToastError from '../../components/Error/ToastError'
import { BlobCommitForm } from '../../components/Commit'

const BlobCreatePage = () => {
    const treepath = useParams()['*']
    const navigate = useNavigate()
    const { daoName, repoName, branchName = 'main' } = useParams()
    const { dao, repository } = useOutletContext<TRepoLayoutOutletContext>()
    const { push, progress: pushProgress } = usePush(
        dao.details,
        repository.adapter,
        branchName,
    )

    const urlBack = `/o/${daoName}/r/${repoName}/tree/${branchName}${
        treepath && `/${treepath}`
    }`

    const onPush = async (values: any) => {
        try {
            const { name, content, title, message, tags, isPullRequest } = values
            const blobObject = {
                treepath: ['', `${treepath ? `${treepath}/` : ''}${name}`],
                original: '',
                modified: content,
            }
            const task = values.task
                ? {
                      task: values.task,
                      assigners: [],
                      reviewers: values.reviewers?.split(' ') || [],
                      manager: values.manager || '',
                  }
                : undefined
            await push(title, [blobObject], { isPullRequest, message, tags, task })
            if (isPullRequest) {
                navigate(`/o/${daoName}/events`, { replace: true })
            } else {
                navigate(urlBack)
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
        <div>
            <BlobCommitForm
                dao={dao}
                repository={repository}
                branch={branchName}
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
