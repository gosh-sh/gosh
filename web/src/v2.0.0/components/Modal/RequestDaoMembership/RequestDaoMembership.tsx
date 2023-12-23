import { Dialog } from '@headlessui/react'
import { Field, Form, Formik } from 'formik'
import { useNavigate } from 'react-router-dom'
import { useSetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../../../store/app.state'
import yup from '../../../yup-extended'
import { ModalCloseButton } from '../../../../components/Modal'
import { FormikTextarea } from '../../../../components/Formik'
import { Button } from '../../../../components/Form'
import { useDao, useCreateDaoMember } from '../../../hooks/dao.hooks'
import { useUser } from '../../../hooks/user.hooks'

type TFormValues = {
  comment: string
}

const RequestDaoMembershipModal = () => {
  const navigate = useNavigate()
  const setModal = useSetRecoilState(appModalStateAtom)
  const { user } = useUser()
  const dao = useDao()
  const { createMember } = useCreateDaoMember()

  const onModalReset = () => {
    setModal((state) => ({ ...state, isOpen: false }))
  }

  const onRequestMembership = async (values: TFormValues) => {
    try {
      const { comment } = values
      await createMember([
        { user: { name: user.username!, type: 'user' }, allowance: 0, comment },
      ])
      onModalReset()
      navigate(`/o/${dao.details.name}/events`)
    } catch (e: any) {
      console.error(e.message)
    }
  }

  return (
    <Dialog.Panel className="relative rounded-xl bg-white p-10 w-full max-w-md">
      <Formik
        initialValues={{ comment: '' }}
        onSubmit={onRequestMembership}
        validationSchema={yup.object().shape({
          comment: yup.string().required(),
        })}
      >
        {({ isSubmitting }) => (
          <Form>
            <ModalCloseButton disabled={isSubmitting} />
            <Dialog.Title className="mb-8 text-3xl text-center font-medium">
              Request membership
            </Dialog.Title>

            <div>
              <Field
                name="comment"
                component={FormikTextarea}
                disabled={isSubmitting}
                autoComplete="off"
                placeholder="Write description of your request to DAO membership"
                maxRows={5}
              />
            </div>
            <div className="mt-4">
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

export { RequestDaoMembershipModal }
