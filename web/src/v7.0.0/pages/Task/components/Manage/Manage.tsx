import classNames from 'classnames'
import { Form, Formik } from 'formik'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../../../../components/Form'
import {
  useDao,
  useDaoMember,
  useDeleteTask,
} from '../../../../hooks/dao.hooks'
import { TTaskDetails } from '../../../../types/dao.types'

type TTaskManageProps = {
  task: TTaskDetails
}

const TaskManage = (props: TTaskManageProps) => {
  const { task } = props
  const navigate = useNavigate()
  const dao = useDao()
  const member = useDaoMember()
  const { deleteTask } = useDeleteTask()

  const onTaskDelete = async () => {
    if (!window.confirm('Delete task?')) {
      return
    }
    try {
      const { eventaddr } = await deleteTask({
        reponame: task.repository.name,
        taskname: task.name,
      })
      navigate(`/o/${dao.details.name}/events/${eventaddr || ''}`)
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

      {!task.isReady && member.isMember && (
        <div className="border-t border-gray-e6edff">
          <div className="p-5">
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
          </div>
        </div>
      )}
    </div>
  )
}

export { TaskManage }
