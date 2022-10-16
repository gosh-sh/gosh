import { Field } from 'formik'
import { Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { TRepoLayoutOutletContext } from '../RepoLayout'
import { SwitchField } from '../../components/Formik'
import { useMergeRequest } from 'react-gosh'
import { toast } from 'react-toastify'
import ToastError from '../../components/Error/ToastError'
import { BranchCompareForm, BranchComparePreview } from '../../components/BranchCompare'
import BranchCommitForm from '../../components/Commit/BranchCommitForm'

const MergeCreatePage = () => {
    const navigate = useNavigate()
    const { daoName, repoName } = useParams()
    const { dao, repo } = useOutletContext<TRepoLayoutOutletContext>()
    const { srcBranch, dstBranch, build, buildProgress, push, pushProgress } =
        useMergeRequest(dao.details, repo)

    const { isFetching, isEmpty } = buildProgress

    const onBuild = async (values: any) => {
        try {
            const { src, dst } = values
            await build(src.name, dst.name)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    const onPush = async (values: any) => {
        try {
            const { title, message, tags, deleteBranch } = values
            await push(title, message, tags, deleteBranch)
            navigate(`/o/${daoName}/r/${repoName}/tree/${dstBranch?.name}`, {
                replace: true,
            })
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    if (!dao.details.isAuthenticated) {
        return <Navigate to={`/o/${daoName}/r/${repoName}`} />
    }
    return (
        <div className="bordered-block px-7 py-8">
            <BranchCompareForm onBuild={onBuild} />

            <BranchComparePreview
                className="mt-5"
                srcBranch={srcBranch}
                dstBranch={dstBranch}
                progress={buildProgress}
            />

            {!isFetching && !isEmpty && (
                <BranchCommitForm
                    className="mt-5"
                    initialValues={{
                        title: `Merge branch '${srcBranch?.name}' into '${dstBranch?.name}'`,
                    }}
                    extraButtons={
                        !srcBranch?.isProtected && (
                            <Field
                                name="deleteBranch"
                                component={SwitchField}
                                className="ml-4"
                                label="Delete branch after merge"
                                labelClassName="text-sm text-gray-505050"
                            />
                        )
                    }
                    progress={pushProgress}
                    onSubmit={onPush}
                />
            )}
        </div>
    )
}

export default MergeCreatePage
