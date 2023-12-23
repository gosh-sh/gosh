import { Dialog } from '@headlessui/react'
import { Field, Form, Formik } from 'formik'
import { useSetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../../../store/app.state'
import { useCallback } from 'react'
import yup from '../../../yup-extended'
import { Button } from '../../../../components/Form'
import { BaseField, FormikInput } from '../../../../components/Formik'
import { UserSelect } from '../../UserSelect'
import { useDaoMember, useSendMemberTokens } from '../../../hooks/dao.hooks'
import { ModalCloseButton } from '../../../../components/Modal'

type TFormValues = {
  username: string
  amount: string
}

const MemberTokenSendModal = () => {
  const setModal = useSetRecoilState(appModalStateAtom)
  const { balance } = useDaoMember()
  const { send } = useSendMemberTokens()

  const getMaxAmount = useCallback(() => {
    if (!balance) {
      return 0
    }

    const voting = balance.voting - balance.locked
    return voting + balance.regular
  }, [balance])

  const onModalReset = () => {
    setModal((state) => ({ ...state, isOpen: false }))
  }

  const onSubmit = async (values: TFormValues) => {
    try {
      const { username, amount } = values
      await send({ username, amount: parseInt(amount) })
      onModalReset()
    } catch (e: any) {
      console.error(e.message)
    }
  }

  return (
    <Dialog.Panel className="relative rounded-xl bg-white p-10 w-full max-w-md">
      <Formik
        initialValues={{
          username: '',
          amount: '',
        }}
        validationSchema={yup.object().shape({
          username: yup.string().required(),
          amount: yup.number().integer().positive().max(getMaxAmount()).required(),
        })}
        enableReinitialize
        onSubmit={onSubmit}
      >
        {({ isSubmitting, setFieldValue }) => (
          <Form>
            <ModalCloseButton disabled={isSubmitting} />
            <Dialog.Title className="mb-8 text-3xl text-center font-medium">
              Send tokens from wallet
            </Dialog.Title>

            <div>
              <Field
                name="username"
                component={BaseField}
                help="You can send tokens to DAO reserve by DAO name"
              >
                <UserSelect
                  placeholder="Username or current DAO name"
                  searchDao
                  isDisabled={isSubmitting}
                  onChange={(option) => {
                    const value = option?.value.name || ''
                    setFieldValue('username', value, true)
                  }}
                />
              </Field>
            </div>
            <div className="mt-6">
              <Field
                name="amount"
                component={FormikInput}
                autoComplete="off"
                placeholder="Amount of tokens to send"
                disabled={isSubmitting}
                help={`Available ${getMaxAmount().toLocaleString()}`}
              />
            </div>
            <div className="mt-4">
              <Button
                type="submit"
                className="w-full"
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                Send tokens
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </Dialog.Panel>
  )
}

export { MemberTokenSendModal }
