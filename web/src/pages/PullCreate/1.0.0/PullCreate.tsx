import { useNavigate } from 'react-router-dom'
import { TDao, usePullRequest } from 'react-gosh'
import { toast } from 'react-toastify'
import ToastError from '../../../components/Error/ToastError'
import { BranchCompareForm, BranchComparePreview } from '../../../components/Branches'
import BranchCommitForm from '../../../components/Commit/BranchCommitForm'
import { IGoshRepositoryAdapter } from 'react-gosh/dist/gosh/interfaces'

type TPullCreate_1_0_0Props = {
    dao: TDao
    repository: IGoshRepositoryAdapter
}

const PullCreate_1_0_0 = (props: TPullCreate_1_0_0Props) => {
    const navigate = useNavigate()
    const { dao, repository } = props
    const { srcBranch, dstBranch, build, buildProgress, push, pushProgress } =
        usePullRequest(dao, repository)
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
            await push(title, { message, tags, deleteSrcBranch: deleteBranch })
            navigate(`/o/${dao.name}/events`, { replace: true })
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
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
                    progress={pushProgress}
                    onSubmit={onPush}
                />
            )}
        </div>
    )
}

export default PullCreate_1_0_0
