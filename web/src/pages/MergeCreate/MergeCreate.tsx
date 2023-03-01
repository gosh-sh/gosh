import { useMergeRequest } from 'react-gosh'
import { Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { BranchCompareForm, BranchComparePreview } from '../../components/Branches'
import { BranchCommitForm, TBranchCommitFormValues } from '../../components/Commit'
import ToastError from '../../components/Error/ToastError'
import { TRepoLayoutOutletContext } from '../RepoLayout'

const MergeCreatePage = () => {
    const { daoName, repoName } = useParams()
    const navigate = useNavigate()
    const { dao, repository } = useOutletContext<TRepoLayoutOutletContext>()
    const { srcBranch, dstBranch, build, buildProgress, push, pushProgress } =
        useMergeRequest(dao.details, repository.adapter, { showDiffNum: 5 })
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

    const onPush = async (values: TBranchCommitFormValues) => {
        try {
            const { title, message, tags, isPullRequest, deleteSrcBranch } = values
            const task = values.task
                ? {
                      task: values.task,
                      assigners: values.assigners?.split(' ') || [],
                      reviewers: values.reviewers?.split(' ') || [],
                      managers: values.managers?.split(' ') || [],
                  }
                : undefined
            await push(title, { message, tags, isPullRequest, deleteSrcBranch, task })
            if (isPullRequest) {
                navigate(`/o/${daoName}/events`, { replace: true })
            } else {
                navigate(`/o/${daoName}/r/${repoName}/tree/${dstBranch?.name}`, {
                    replace: true,
                })
            }
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    if (!dao.details.isAuthMember) {
        return <Navigate to={`/o/${daoName}/r/${repoName}`} />
    }
    return (
        <>
            <div className="border border-gray-e6edff rounded-xl p-5">
                <BranchCompareForm onBuild={onBuild} />
                <BranchComparePreview
                    className="relative mt-5"
                    srcBranch={srcBranch}
                    dstBranch={dstBranch}
                    progress={buildProgress}
                />
            </div>

            {!isFetching && !isEmpty && (
                <BranchCommitForm
                    dao={dao}
                    repository={repository}
                    className="mt-12"
                    initialValues={{
                        title: `Merge branch '${srcBranch?.name}' into '${dstBranch?.name}'`,
                    }}
                    progress={pushProgress}
                    onSubmit={onPush}
                />
            )}
        </>
    )
}

export default MergeCreatePage
