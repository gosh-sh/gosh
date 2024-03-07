import { faPlus, faTimes } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  ErrorMessage,
  Field,
  FieldArray,
  FieldArrayRenderProps,
  Form,
  Formik,
} from 'formik'
import { AnimatePresence, motion } from 'framer-motion'
import { TDao } from 'react-gosh'
import { IGoshRepositoryAdapter } from 'react-gosh/dist/gosh/interfaces'
import { useNavigate } from 'react-router-dom'
import { useSetRecoilState } from 'recoil'
import { Button } from '../../../components/Form'
import { BaseField, FormikInput } from '../../../components/Formik'
import Loader from '../../../components/Loader'
import { appModalStateAtom } from '../../../store/app.state'
import { useApplicationForm } from '../../hooks/appform.hooks'
import { useIssueICToken } from '../../hooks/ic.hooks'
import { TUserSelectOption } from '../../types/form.types'
import yup from '../../yup-extended'
import { UserSelect } from '../UserSelect'

const getFormValidationSchema = () => {
  return yup.object().shape({
    token_name: yup.string().required(),
    token_symbol: yup.string().required(),
    token_decimals: yup.number().integer(),
    recipients: yup
      .array()
      .of(
        yup.object().shape({
          user: yup.object().required(),
          amount: yup.number().positive().integer().required(),
        }),
      )
      .min(1),
  })
}

type TFormValues = {
  token_name: string
  token_symbol: string
  token_decimals: string
  recipients: { _motion_id: number; user: TUserSelectOption; amount: string }[]
}

type TIssueICTokenProps = {
  dao_details: TDao
  repo_adapter: IGoshRepositoryAdapter
  repo_metadata: { [key: string]: any }
}

const IssueICToken = (props: TIssueICTokenProps) => {
  const { dao_details, repo_adapter, repo_metadata } = props
  const setModal = useSetRecoilState(appModalStateAtom)
  const navigate = useNavigate()
  const { is_fetching, application_form } = useApplicationForm({
    form_filename: 'forms/ic_credit_characteristic.form.json',
    repo_adapter,
    branch: repo_metadata.forms_branch,
  })
  const { issue } = useIssueICToken({ dao_details, repo_adapter })

  const getFormInitialValues = () => {
    const fields = application_form?.form.fields
    const token_name = fields?.find((f) => f.name === 'token_name')?.value || ''
    const token_symbol = fields?.find((f) => f.name === 'token_symbol')?.value || ''
    const token_decimals = fields?.find((f) => f.name === 'token_decimals')?.value || ''
    return { token_name, token_symbol, token_decimals, recipients: [] }
  }

  const submit = async (values: TFormValues) => {
    try {
      const { eventaddr } = await issue({
        token: {
          name: values.token_name,
          symbol: values.token_symbol,
          decimals: parseInt(values.token_decimals),
        },
        recipients: values.recipients,
      })

      setModal((state) => ({ ...state, isOpen: false }))
      if (eventaddr) {
        navigate(`/o/${dao_details.name}/events/${eventaddr}`)
      }
    } catch (e: any) {
      console.error(e.message)
    }
  }

  return (
    <Formik
      initialValues={getFormInitialValues()}
      validationSchema={getFormValidationSchema()}
      enableReinitialize
      onSubmit={submit}
    >
      {({ isSubmitting, errors }) => (
        <Form>
          <h3 className="text-xl font-medium mb-6">Issue IC tokens</h3>

          {is_fetching && (
            <Loader className="text-sm">Loading application form...</Loader>
          )}

          {application_form && (
            <div className="flex flex-col gap-1">
              <h4 className="mb-2 text-sm text-gray-7c8db5">Review token data</h4>
              {application_form.form.fields.map((field, index) => (
                <div key={index} className="grid grid-cols-[2fr_1fr] gap-4">
                  <div className="text-sm text-gray-53596d">{field.label}</div>
                  <div>{field.value}</div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4">
            <h4 className="mb-2 text-sm text-gray-7c8db5">Token recipients</h4>
            {typeof errors.recipients === 'string' && (
              <ErrorMessage
                className="text-xs bg-rose-100 text-rose-500 mt-1 px-2 py-1 rounded"
                component="div"
                name="recipients"
              />
            )}
            <FieldArray name="recipients" component={FieldArrayForm} />
          </div>

          <div className="mt-6 text-center">
            <Button type="submit" disabled={isSubmitting} isLoading={isSubmitting}>
              Issue tokens
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  )
}

const FieldArrayForm = (props: FieldArrayRenderProps | string | void) => {
  const { form, remove, push } = props as FieldArrayRenderProps
  const values = form.values as TFormValues

  const onFieldAdd = () => {
    push({ _motion_id: Math.random(), user: '', amount: '' })
  }

  return (
    <>
      <div className="flex flex-col space-y-3">
        <AnimatePresence>
          {values.recipients.map((item, index) => (
            <motion.div
              key={item._motion_id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              exit={{ opacity: 0, transition: { duration: 0.4 } }}
              className="flex items-center gap-x-3"
            >
              <div className="flex-[2_2_0%] relative">
                <Field name={`recipients.${index}.user`} component={BaseField}>
                  <UserSelect
                    className="z-[2]"
                    placeholder="Username"
                    isDisabled={form.isSubmitting}
                    onChange={(option) => {
                      form.setFieldValue(`recipients.${index}.user`, option)
                    }}
                  />
                </Field>
                {Array.isArray(form.errors.recipients) && (
                  <ErrorMessage
                    className="text-xs bg-rose-100 text-rose-500 mt-1 px-2 py-1 rounded absolute z-[1]"
                    component="div"
                    name={`recipients.${index}.user`}
                  />
                )}
              </div>

              <div className="flex-[1_1_0%] relative">
                <Field
                  name={`recipients.${index}.amount`}
                  component={FormikInput}
                  placeholder="Amount"
                  autoComplete="off"
                  disabled={form.isSubmitting}
                />
                {Array.isArray(form.errors.recipients) && (
                  <ErrorMessage
                    className="text-xs bg-rose-100 text-rose-500 mt-1 px-2 py-1 rounded absolute z-[1]"
                    component="div"
                    name={`recipients.${index}.amount`}
                  />
                )}
              </div>

              <div className="text-right">
                <Button
                  type="button"
                  variant="custom"
                  className="!p-1"
                  disabled={form.isSubmitting}
                  onClick={() => remove(index)}
                >
                  <FontAwesomeIcon icon={faTimes} size="xl" />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-3">
        <Button
          type="button"
          variant="custom"
          size="sm"
          className="block border !border-blue-2b89ff text-blue-2b89ff !rounded-[2rem]"
          disabled={form.isSubmitting}
          onClick={onFieldAdd}
        >
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          Add field
        </Button>
      </div>
    </>
  )
}

export { IssueICToken }
