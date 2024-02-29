import classNames from 'classnames'
import { TMilestoneTaskDetails } from '../../../../types/dao.types'
import { useDeleteMilestoneTask, useReceiveTaskReward } from '../../../../hooks/dao.hooks'
import { Form, Formik } from 'formik'
import { Button } from '../../../../../components/Form'
import { useUser } from '../../../../hooks/user.hooks'
import { useMemo } from 'react'
import { isTaskTeamMember } from '../../../../components/Task'

type TSubtaskManageProps = {
  task: TMilestoneTaskDetails
  milestone: TMilestoneTaskDetails
}

const SubtaskManage = (props: TSubtaskManageProps) => {
  const { task, milestone } = props
  const { user } = useUser()
  const { receiveReward } = useReceiveTaskReward()
  const { deleteMilestoneTask } = useDeleteMilestoneTask()

  const isReady = milestone.isReady && (task.isReady || task.team)
  const canDelete = !isReady && user.profile === milestone.team?.managers[0].profile
  const isTeamMember = useMemo(() => {
    return isTaskTeamMember(task.team, user.profile)
  }, [user.profile, isReady])

  const onTaskDelete = async () => {
    if (!window.confirm('Delete milestone task?')) {
      return
    }
    try {
      await deleteMilestoneTask({
        milename: task.milestone.name,
        reponame: task.repository.name,
        index: task.index,
      })
    } catch (e: any) {
      console.error(e.message)
    }
  }

  const onTaskClaim = async () => {
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
          <h3>Reward</h3>
          <div>{task.reward.toLocaleString()}</div>
        </div>

        <div className="pt-4 flex flex-col gap-y-2">
          <div className="flex flex-wrap justify-between gap-2">
            <div className="text-gray-7c8db5 text-sm">Assigner</div>
            <div className="font-medium">{task.grantTotal.assign.toLocaleString()}</div>
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
          {canDelete && (
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

          {isReady && isTeamMember && (
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

export { SubtaskManage }
