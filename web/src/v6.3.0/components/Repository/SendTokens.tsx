import { Field, Form, Formik } from 'formik'
import { TDao } from 'react-gosh'
import { IGoshRepositoryAdapter } from 'react-gosh/dist/gosh/interfaces'
import { Button } from '../../../components/Form'
import { BaseField, FormikInput } from '../../../components/Formik'
import { fromBigint } from '../../../utils'
import { useRepoTokenWallet, useSendRepoTokens } from '../../hooks/repository.hooks'
import { TUserSelectOption } from '../../types/form.types'
import yup from '../../yup-extended'
import { UserSelect } from '../UserSelect'

type TFormValues = {
  recipient: TUserSelectOption | null
  value: string
}

type TSendRepoTokensProps = {
  repo_addr: string
  _rm: { dao_details: TDao; repo_name: string; repo_adapter: IGoshRepositoryAdapter }
  onSubmit?(): void
}

const SendRepoTokens = (props: TSendRepoTokensProps) => {
  const { repo_addr, _rm, onSubmit } = props
  const wallet = useRepoTokenWallet({
    _rm: {
      dao_details: _rm.dao_details,
      repo_name: _rm.repo_name,
      repo_adapter: _rm.repo_adapter,
    },
  })
  const { send } = useSendRepoTokens({ dao_name: _rm.dao_details.name, repo_addr })

  const getMaxValue = () => {
    if (!wallet) {
      return 0
    }
    return Number(fromBigint(wallet.balance, wallet.token.decimals))
  }

  const submit = async (values: TFormValues) => {
    try {
      await send({ recipient: values.recipient!, value: values.value })
      if (onSubmit) {
        onSubmit()
      }
    } catch (e: any) {
      console.error(e.message)
    }
  }

  return (
    <>
      <h3 className="text-xl text-center font-medium mb-6">Send repository tokens</h3>
      <Formik
        initialValues={{ recipient: null, value: '' }}
        validationSchema={yup.object().shape({
          recipient: yup.object().shape({ label: yup.string().required() }),
          value: yup.number().integer().positive().required().max(getMaxValue()),
        })}
        onSubmit={submit}
      >
        {({ isSubmitting, setFieldValue }) => (
          <Form>
            <div className="flex flex-col gap-4">
              <div>
                <Field name="recipient" component={BaseField}>
                  <UserSelect
                    placeholder="Username"
                    isDisabled={isSubmitting}
                    onChange={(option) => {
                      setFieldValue('recipient', option)
                    }}
                  />
                </Field>
              </div>

              <div>
                <Field
                  name="value"
                  component={FormikInput}
                  placeholder="Amount"
                  disabled={isSubmitting}
                  autoComplete="off"
                  help={`Max ${getMaxValue()}`}
                />
              </div>
            </div>

            <div className="mt-6 text-center">
              <Button type="submit" disabled={isSubmitting} isLoading={isSubmitting}>
                Send
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </>
  )
}

export { SendRepoTokens }
