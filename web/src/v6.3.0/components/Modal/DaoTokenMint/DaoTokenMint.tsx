import { Dialog } from '@headlessui/react'
import { Field, Form, Formik } from 'formik'
import yup from '../../../yup-extended'
import { useNavigate } from 'react-router-dom'
import { useSetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../../../store/app.state'
import { FormikInput, FormikTextarea } from '../../../../components/Formik'
import { Button } from '../../../../components/Form'
import { useDao, useMintDaoTokens } from '../../../hooks/dao.hooks'
import { ModalCloseButton } from '../../../../components/Modal'

type TFormValues = {
  amount: string
  comment: string
}

const DaoTokenMintModal = () => {
  const navigate = useNavigate()
  const setModal = useSetRecoilState(appModalStateAtom)
  const dao = useDao()
  const { mint } = useMintDaoTokens()

  const onModalReset = () => {
    setModal((state) => ({ ...state, isOpen: false }))
  }

  const onSubmit = async (values: TFormValues) => {
    try {
      const { comment } = values
      const { eventaddr } = await mint({ amount: parseInt(values.amount), comment })
      onModalReset()
      if (eventaddr) {
        navigate(`/o/${dao.details.name}/events/${eventaddr}`)
      }
    } catch (e: any) {
      console.error(e.message)
    }
  }

  return (
    <Dialog.Panel className="relative rounded-xl bg-white p-10 w-full max-w-md">
      <Formik
        initialValues={{
          amount: '',
          comment: '',
        }}
        validationSchema={yup.object().shape({
          amount: yup.number().integer().positive().required(),
          comment: yup.string().required(),
        })}
        onSubmit={onSubmit}
      >
        {({ isSubmitting }) => (
          <Form>
            <ModalCloseButton disabled={isSubmitting} />
            <Dialog.Title className="mb-8 text-3xl text-center font-medium">
              Mint tokens
            </Dialog.Title>

            <div className="mt-6">
              <Field
                name="amount"
                component={FormikInput}
                autoComplete="off"
                placeholder="Amount of tokens to mint"
                disabled={isSubmitting}
              />
            </div>
            <hr className="mt-8 mb-6 bg-gray-e6edff" />
            <div>
              <Field
                name="comment"
                component={FormikTextarea}
                disabled={isSubmitting}
                placeholder="Write a description so that the DAO members can understand it"
              />
            </div>
            <div className="mt-4">
              <Button
                type="submit"
                className="w-full"
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                Mint tokens
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </Dialog.Panel>
  )
}

export { DaoTokenMintModal }
