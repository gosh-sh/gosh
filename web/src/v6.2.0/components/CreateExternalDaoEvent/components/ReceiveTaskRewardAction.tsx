import { Field, useFormikContext } from 'formik'
import { FormikInput } from '../../../../components/Formik'
import { TFormValues } from '../CreateExternalDaoEvent'

const ReceiveTaskRewardAction = () => {
  const formik = useFormikContext<TFormValues>()

  return (
    <>
      <div>
        <Field
          component={FormikInput}
          name="action_data.receive_task_reward.task_addr"
          placeholder="Task address"
          disabled={formik.isSubmitting}
          autoComplete="off"
          help="Put task address from selected DAO"
          value={formik.values.action_data.receive_task_reward?.task_addr || ''}
        />
      </div>
    </>
  )
}

export { ReceiveTaskRewardAction }
