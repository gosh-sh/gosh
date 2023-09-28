import classNames from 'classnames'
import { TTaskDetails } from '../../../../types/dao.types'
import {
    useDao,
    useDaoMember,
    useDeleteTask,
    useReceiveTaskReward,
} from '../../../../hooks/dao.hooks'
import { Form, Formik } from 'formik'
import { Button } from '../../../../../components/Form'
import { useUser } from '../../../../hooks/user.hooks'
import { useMemo } from 'react'
import { toast } from 'react-toastify'
import { ToastError, ToastSuccess } from '../../../../../components/Toast'
import { useNavigate } from 'react-router-dom'
import { isTaskTeamMember } from '../../../../components/Task/helpers'

type TTaskManageProps = {
    task: TTaskDetails
}

const TaskManage = (props: TTaskManageProps) => {
    const { task } = props
    const navigate = useNavigate()
    const { user } = useUser()
    const dao = useDao()
    const member = useDaoMember()
    const { receiveReward } = useReceiveTaskReward()
    const { deleteTask } = useDeleteTask()

    const isTeamMember = useMemo(() => {
        return isTaskTeamMember(task.team, user.profile)
    }, [user.profile, task.isReady])

    const onTaskDelete = async () => {
        if (!window.confirm('Delete task?')) {
            return
        }
        try {
            await deleteTask({ reponame: task.repository.name, taskname: task.name })
            navigate(`/o/${dao.details.name}/events`)
        } catch (e: any) {
            console.error(e.message)
        }
    }

    const onTaskClaim = async () => {
        try {
            await receiveReward({ reponame: task.repository.name, taskname: task.name })
            toast.success(
                <ToastSuccess
                    message={{
                        title: 'Receive reward',
                        content: 'Receive reward request sent',
                    }}
                />,
            )
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    return (
        <div className="border border-gray-e6edff rounded-xl overflow-hidden">
            <div className="p-5">
                <div
                    className={classNames(
                        'flex flex-wrap justify-between gap-2',
                        'pb-4 border-b border-gray-e6edff',
                        'text-xl font-medium',
                    )}
                >
                    <h3>Reward</h3>
                    <div>{task.reward.toLocaleString()}</div>
                </div>

                <div className="pt-4 flex flex-col gap-y-2">
                    <div className="flex flex-wrap justify-between gap-2">
                        <div className="text-gray-7c8db5 text-sm">Assigner</div>
                        <div className="font-medium">
                            {task.grantTotal.assign.toLocaleString()}
                        </div>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2">
                        <div className="text-gray-7c8db5 text-sm">Reviewer</div>
                        {task.grantTotal.review.toLocaleString()}
                    </div>
                    <div className="flex flex-wrap justify-between gap-2">
                        <div className="text-gray-7c8db5 text-sm">Manager</div>
                        {task.grantTotal.manager.toLocaleString()}
                    </div>
                </div>
            </div>
            <div className="border-t border-gray-e6edff">
                <div className="p-5">
                    {!task.isReady && member.isMember && (
                        <Formik initialValues={{}} onSubmit={onTaskDelete}>
                            {({ isSubmitting }) => (
                                <Form>
                                    <Button
                                        type="submit"
                                        variant="outline-danger"
                                        className="w-full"
                                        isLoading={isSubmitting}
                                        disabled={isSubmitting}
                                    >
                                        Delete task
                                    </Button>
                                </Form>
                            )}
                        </Formik>
                    )}

                    {task.isReady && isTeamMember && (
                        <Formik initialValues={{}} onSubmit={onTaskClaim}>
                            {({ isSubmitting }) => (
                                <Form>
                                    <Button
                                        type="submit"
                                        className="w-full"
                                        isLoading={isSubmitting}
                                        disabled={isSubmitting}
                                    >
                                        Claim reward
                                    </Button>
                                </Form>
                            )}
                        </Formik>
                    )}
                </div>
            </div>
        </div>
    )
}

export { TaskManage }
