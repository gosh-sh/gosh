import classNames from 'classnames'
import { TMilestoneTaskDetails } from '../../../types/dao.types'
import {
    useCompleteMilestone,
    useDao,
    useDaoMember,
    useDeleteMilestone,
    useReceiveMilestoneReward,
} from '../../../hooks/dao.hooks'
import { Form, Formik } from 'formik'
import { Button } from '../../../../components/Form'
import { useNavigate } from 'react-router-dom'
import { isTaskTeamMember, lockToStr } from '../../../components/Task/helpers'
import { useMemo } from 'react'
import { useUser } from '../../../hooks/user.hooks'

type TMilestoneManageProps = {
    task: TMilestoneTaskDetails
}

const MilestoneManage = (props: TMilestoneManageProps) => {
    const { task } = props
    const navigate = useNavigate()
    const { user } = useUser()
    const dao = useDao()
    const member = useDaoMember()
    const { completeMilestone } = useCompleteMilestone()
    const { deleteMilestone } = useDeleteMilestone()
    const { receiveReward } = useReceiveMilestoneReward()

    const canComplete =
        !!task.subtasks.length && task.subtasks.every((item) => !!item.team)
    const isTeamMember = useMemo(() => {
        return isTaskTeamMember(task.team, user.profile)
    }, [user.profile, task.isReady])

    const onMilestoneComplete = async () => {
        if (!window.confirm('Complete milestone?')) {
            return
        }
        try {
            const { eventaddr } = await completeMilestone({
                reponame: task.repository.name,
                taskname: task.name,
            })
            navigate(`/o/${dao.details.name}/events/${eventaddr || ''}`)
        } catch (e: any) {
            console.error(e.message)
        }
    }

    const onMilestoneDelete = async () => {
        if (!window.confirm('Delete milestone?')) {
            return
        }
        try {
            const { eventaddr } = await deleteMilestone({
                reponame: task.repository.name,
                taskname: task.name,
            })
            navigate(`/o/${dao.details.name}/events/${eventaddr || ''}`)
        } catch (e: any) {
            console.error(e.message)
        }
    }

    const onMilestoneClaim = async () => {
        try {
            await receiveReward({ reponame: task.repository.name, taskname: task.name })
        } catch (e: any) {
            console.error(e.message)
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
                    <h3>Milestone budget</h3>
                    <div>{task.reward.toLocaleString()}</div>
                </div>

                <div className="pt-4 flex flex-col gap-y-2">
                    <div className="flex flex-wrap justify-between gap-2">
                        <div className="text-gray-7c8db5 text-sm">Vesting</div>
                        <div>{lockToStr(task.vestingEnd)}</div>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2">
                        <div className="text-gray-7c8db5 text-sm">Manager reward</div>
                        <div>{task.grantTotal.manager.toLocaleString()}</div>
                    </div>
                </div>
            </div>
            <div className="border-t border-gray-e6edff">
                <div className="p-5">
                    {!task.isReady && member.isMember && (
                        <>
                            <div className="mb-4">
                                <Formik initialValues={{}} onSubmit={onMilestoneComplete}>
                                    {({ isSubmitting }) => (
                                        <Form>
                                            <Button
                                                type="submit"
                                                className="w-full"
                                                isLoading={isSubmitting}
                                                disabled={isSubmitting || !canComplete}
                                            >
                                                Complete milestone
                                            </Button>
                                        </Form>
                                    )}
                                </Formik>
                            </div>

                            <div>
                                <Formik initialValues={{}} onSubmit={onMilestoneDelete}>
                                    {({ isSubmitting }) => (
                                        <Form>
                                            <Button
                                                type="submit"
                                                variant="outline-danger"
                                                className="w-full"
                                                isLoading={isSubmitting}
                                                disabled={isSubmitting}
                                            >
                                                Delete milestone
                                            </Button>
                                        </Form>
                                    )}
                                </Formik>
                            </div>
                        </>
                    )}

                    {task.isReady && isTeamMember && (
                        <div>
                            <Formik initialValues={{}} onSubmit={onMilestoneClaim}>
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
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export { MilestoneManage }
