import { Dialog } from '@headlessui/react'
import { Field, Form, Formik } from 'formik'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../../components/Form'
import { BaseField, FormikInput } from '../../../components/Formik'
import { ModalCloseButton } from '../../../components/Modal'
import { useDao, useSendTokensAsDao } from '../../hooks/dao.hooks'
import { TDaoIsMemberOfListItem } from '../../types/dao.types'
import { TUserSelectOption } from '../../types/form.types'
import yup from '../../yup-extended'
import { UserSelect } from '../UserSelect'

export type TFormValues = {
  dst: TUserSelectOption | null
  amount: string
}

type TSendExternalDaoTokensProps = {
  item: TDaoIsMemberOfListItem
  close(): void
  onSuccess(): void
}

const SendExternalDaoTokens = (props: TSendExternalDaoTokensProps) => {
  const { item, close, onSuccess } = props
  const dao = useDao()
  const navigate = useNavigate()
  const { sendTokens } = useSendTokensAsDao()

  const submit = async (values: TFormValues) => {
    try {
      const { eventaddr } = await sendTokens({
        external_dao: { name: item.dao_name, src_wallet: item.wallet.address },
        dst: values.dst!,
        amount: Number.parseInt(values.amount),
      })

      if (eventaddr) {
        navigate(`/o/${dao.details.name}/events/${eventaddr}`)
      }

      close()
      onSuccess()
    } catch (e: any) {
      console.error(e)
    }
  }

  return (
    <Dialog.Panel className="relative rounded-xl bg-white p-10 w-full max-w-sm">
      <Formik
        initialValues={{
          dst: null,
          amount: '',
        }}
        validationSchema={yup.object().shape({
          dst: yup
            .object()
            .nullable()
            .shape({
              label: yup.string().required('Username is required'),
            })
            .required('Field is required'),
          amount: yup
            .number()
            .positive()
            .max(item.balance)
            .required('Field is required'),
        })}
        onSubmit={submit}
      >
        {({ isSubmitting, setFieldValue }) => (
          <Form>
            <ModalCloseButton disabled={isSubmitting} close={close} />
            <Dialog.Title className="mb-8 text-2xl text-center font-medium">
              Send external DAO tokens
            </Dialog.Title>

            <div className="mt-6 flex flex-col gap-y-4">
              <div className="relative">
                <Field
                  name="dst"
                  component={BaseField}
                  help="If you select token owner DAO, tokens will be sent to DAO reserve"
                >
                  <UserSelect
                    placeholder="Username or DAO name"
                    isDisabled={isSubmitting}
                    searchDao
                    searchUser
                    onChange={(option) => setFieldValue('dst', option)}
                  />
                </Field>
              </div>

              <div>
                <Field
                  name="amount"
                  component={FormikInput}
                  disabled={isSubmitting}
                  autoComplete="off"
                  placeholder="Amount"
                  help={`Max ${item.balance.toLocaleString()}`}
                />
              </div>
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

export { SendExternalDaoTokens }
