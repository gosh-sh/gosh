import { Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { TRepoLayoutOutletContext } from '../RepoLayout'
import { usePush } from 'react-gosh'
import { toast } from 'react-toastify'
import ToastError from '../../components/Error/ToastError'
import BlobCommitForm from '../../components/Commit/BlobCommitForm'

const BlobCreatePage = () => {
    const treepath = useParams()['*']
    const navigate = useNavigate()
    const { daoName, repoName, branchName = 'main' } = useParams()
    const { dao, repo } = useOutletContext<TRepoLayoutOutletContext>()
    const { push, progress: pushProgress } = usePush(dao.details, repo, branchName)

    const urlBack = `/o/${daoName}/r/${repoName}/tree/${branchName}${
        treepath && `/${treepath}`
    }`

    const onPush = async (values: any) => {
        try {
            const { name, title, message, tags, content } = values
            const treepathNew = `${treepath ? `${treepath}/` : ''}${name}`
            await push(
                title,
                [{ treepath: treepathNew, original: '', modified: content }],
                message,
                tags,
            )
            navigate(urlBack)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    if (!dao.details.isAuthMember) return <Navigate to={urlBack} />
    return (
        <div className="bordered-block py-8">
            <BlobCommitForm
                dao={daoName!}
                repo={repoName!}
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
