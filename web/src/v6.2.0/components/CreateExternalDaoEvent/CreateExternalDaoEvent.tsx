import { Dialog } from '@headlessui/react'
import { Field, Form, Formik } from 'formik'
import { ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useSetRecoilState } from 'recoil'
import { Button } from '../../../components/Form'
import { BaseField, FormikSelect } from '../../../components/Formik'
import { ModalCloseButton } from '../../../components/Modal'
import { ToastError } from '../../../components/Toast'
import { GoshError } from '../../../errors'
import { appModalStateAtom } from '../../../store/app.state'
import { useDao, useReceiveTaskRewardAsDao } from '../../hooks/dao.hooks'
import { TUserSelectOption } from '../../types/form.types'
import yup from '../../yup-extended'
import { UserSelect } from '../UserSelect'
import { ReceiveTaskRewardAction } from './components'

export type TFormValues = {
  dao: TUserSelectOption | null
  action_type: string
  action_data: {
    type: string
    receive_task_reward?: {
      task_addr: string
    }
  }
}

enum EActionType {
  RECEIVE_TASK_REWARD = 'receive_task_reward',
}

const defaultActionData: { [key: string]: any } = {
  '': {},
  [EActionType.RECEIVE_TASK_REWARD]: {
    task_addr: '',
  },
}

const CreateExternalDaoEvent = () => {
  const navigate = useNavigate()
  const setModal = useSetRecoilState(appModalStateAtom)
  const dao = useDao()
  const { receiveReward } = useReceiveTaskRewardAsDao()

  const submit = async (values: TFormValues) => {
    try {
      let eventaddr: string | null = null

      if (values.action_type === EActionType.RECEIVE_TASK_REWARD) {
        if (!values.action_data.receive_task_reward) {
          throw { message: 'Form data is undefined' }
        }
        const result = await receiveReward({
          external_dao_name: values.dao!.value.name,
          task_addr: values.action_data.receive_task_reward.task_addr,
        })
        eventaddr = result.eventaddr
      }

      setModal((state) => ({ ...state, isOpen: false }))
      if (eventaddr) {
        navigate(`/o/${dao.details.name}/events/${eventaddr}`)
      }
    } catch (e: any) {
      if (!(e instanceof GoshError)) {
        toast.error(
          <ToastError
            error={{ name: 'Validation error', message: e.message }}
          />,
        )
      }

      console.error(e)
    }
  }

  return (
    <Dialog.Panel className="relative rounded-xl bg-white p-10 w-full max-w-md">
      <Formik
        initialValues={{
          dao: null,
          action_type: '',
          action_data: { type: '' },
        }}
        validationSchema={yup.object().shape({
          dao: yup
            .object()
            .nullable()
            .shape({
              label: yup.string().required('DAO is required'),
            })
            .required(),
          action_type: yup.string().required(),
          action_data: yup.lazy((value) => {
            if (value.type === EActionType.RECEIVE_TASK_REWARD) {
              return yup.object().shape({
                receive_task_reward: yup.object().shape({
                  task_addr: yup.string().required('Field is required'),
                }),
              })
            }
            return yup.mixed().notRequired()
          }),
        })}
        onSubmit={submit}
      >
        {({ isSubmitting, setFieldValue, values, handleChange }) => (
          <Form>
            <ModalCloseButton disabled={isSubmitting} />
            <Dialog.Title className="mb-8 text-2xl text-center font-medium">
              Create external event
            </Dialog.Title>

            <div className="mt-6 flex flex-col gap-y-4">
              <div className="relative">
                <Field name="dao" component={BaseField}>
                  <UserSelect
                    placeholder="External DAO name"
                    isDisabled={isSubmitting}
                    searchDao
                    searchUser={false}
                    onChange={(option) => setFieldValue('dao', option)}
                  />
                </Field>
              </div>

              <div>
                <Field
                  name="action_type"
                  component={FormikSelect}
                  disabled={isSubmitting}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                    const value = e.target.value || ''
                    handleChange(e)
                    setTimeout(() => {
                      setFieldValue('action_data', {
                        type: value,
                        ...(value && { [value]: defaultActionData[value] }),
                      })
                    }, 5)
                  }}
                >
                  <option value="">Choose action type</option>
                  <option value={EActionType.RECEIVE_TASK_REWARD}>
                    Receive task reward
                  </option>
                </Field>
              </div>

              {values.action_type === EActionType.RECEIVE_TASK_REWARD && (
                <ReceiveTaskRewardAction />
              )}
            </div>

            <div className="mt-6">
              <Button
                type="submit"
                className="w-full"
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                Create event
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </Dialog.Panel>
  )
}

export { CreateExternalDaoEvent }
