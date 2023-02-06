import { useNavigate } from 'react-router-dom'
import { GoshError, TDao, usePullRequest } from 'react-gosh'
import { toast } from 'react-toastify'
import ToastError from '../../../components/Error/ToastError'
import { BranchCompareForm, BranchComparePreview } from '../../../components/Branches'
import { IGoshRepositoryAdapter } from 'react-gosh/dist/gosh/interfaces'
import BranchCommitTaskForm from '../../../components/Commit/BranchCommitTaskForm'

type TPullCreate_1_1_0Props = {
    dao: TDao
    repository: IGoshRepositoryAdapter
}

const PullCreate_1_1_0 = (props: TPullCreate_1_1_0Props) => {
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
            const { title, message, tags, task, review, manager } = values

            if (
                [task, review, manager].some((i) => !!i) &&
                [task, review, manager].some((i) => !i)
            ) {
                throw new GoshError(
                    'Task name, reviewer, manager should be filled or all empty',
                )
            }

            let taskConfig
            if ([task, review, manager].every((i) => !!i)) {
                taskConfig = {
                    task,
                    assigners: [],
                    reviewer: review,
                    manager,
                }
            }

            await push(title, { message, tags, task: taskConfig })
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
                <BranchCommitTaskForm
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

export default PullCreate_1_1_0
