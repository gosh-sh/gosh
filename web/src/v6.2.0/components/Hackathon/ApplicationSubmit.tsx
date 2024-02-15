import { faPlus, faTimes } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Dialog } from '@headlessui/react'
import classNames from 'classnames'
import {
  ErrorMessage,
  Field,
  FieldArray,
  FieldArrayRenderProps,
  Form,
  Formik,
} from 'formik'
import { AnimatePresence, motion } from 'framer-motion'
import AsyncSelect from 'react-select/async'
import { useSetRecoilState } from 'recoil'
import { AppConfig } from '../../../appconfig'
import { Button, ButtonLink } from '../../../components/Form'
import { BaseField, FormikInput } from '../../../components/Formik'
import { ModalCloseButton } from '../../../components/Modal'
import { Select2ClassNames } from '../../../helpers'
import { appModalStateAtom } from '../../../store/app.state'
import { useUser } from '../../hooks/user.hooks'
import { TFormGeneratorField, TUserSelectOption } from '../../types/form.types'
import { THackathonDetails } from '../../types/hackathon.types'
import yup from '../../yup-extended'
import { UserSelect } from '../UserSelect'

type TFormParticipant = { dao_name: string; dao_version: string; repo_names: string[] }

type TFormValues = {
  applications: TFormParticipant[]
  form_data?: any
}

type TApplicationSubmitProps = {
  application_form?: THackathonDetails['storagedata']['application_form']
  onSubmit(params: {
    items: { dao_name: string; repo_name: string }[]
    application_form?: {
      owners: TUserSelectOption['value'][]
      fields: (TFormGeneratorField & { value: string })[]
    }
  }): Promise<void>
}

const getRepositoryOptions = async (params: {
  application: TFormParticipant
  input: string
}) => {
  const { application } = params
  const input = params.input.toLowerCase()
  const options: any[] = []

  const sc = AppConfig.goshroot.getSystemContract(application.dao_version)
  const query = await sc.getRepository({ path: `${application.dao_name}/${input}` })
  if (await query.isDeployed()) {
    options.push({
      label: input,
      value: {
        name: input,
        address: query.address,
      },
    })
  }

  return options
}

const HackathonApplicationSubmit = (props: TApplicationSubmitProps) => {
  const { application_form, onSubmit } = props

  const getFormValidationSchema = () => {
    const form_data =
      application_form?.fields.map((field) => [field.name, yup.string().required()]) || []

    const schema = yup.object().shape({
      applications: yup
        .array()
        .of(
          yup.object().shape({
            dao_name: yup.string().required(),
            repo_names: yup.array().of(yup.string().required()).min(1),
          }),
        )
        .min(1),
      form_data: yup.object().shape(Object.fromEntries(form_data)),
    })

    return schema
  }

  const getFormInitialValues = () => {
    const form_data = application_form?.fields.map((field) => [field.name, '']) || []
    return {
      applications: [],
      form_data: Object.fromEntries(form_data),
    }
  }

  const onFormSubmit = async (values: TFormValues) => {
    try {
      // Generate filled application form
      const app_form = application_form && {
        owners: application_form?.owners,
        fields: application_form?.fields.map((field) => ({
          ...field,
          value: values.form_data[field.name],
        })),
      }

      // Submitted applications
      const items: { dao_name: string; repo_name: string }[] = []
      for (const item of values.applications) {
        const group = item.repo_names.map((repo_name) => ({
          dao_name: item.dao_name,
          repo_name,
        }))
        items.push(...group)
      }

      await onSubmit({ application_form: app_form, items })
    } catch (e: any) {
      console.error(e.message)
    }
  }

  return (
    <Dialog.Panel className="relative rounded-xl bg-white p-10 w-full max-w-md">
      <Formik
        initialValues={getFormInitialValues()}
        validationSchema={getFormValidationSchema()}
        onSubmit={onFormSubmit}
      >
        {({ isSubmitting, errors }) => (
          <Form>
            <ModalCloseButton disabled={isSubmitting} />

            <h1 className="mb-6 text-xl font-medium">Add applications</h1>

            {application_form && application_form.fields.length > 0 && (
              <>
                <h4 className="mb-2">Application form</h4>
                <div className="mb-6 flex flex-col space-y-2">
                  {application_form.fields.map((field, index) => (
                    <div key={index}>
                      <Field
                        component={FormikInput}
                        name={`form_data.${field.name}`}
                        label={field.label}
                        autoComplete="off"
                        disabled={isSubmitting}
                      />
                      <ErrorMessage
                        component="div"
                        name={`form_data.${field.name}`}
                        className="text-xs text-red-ff3b30 mt-1"
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            <div>
              <h4>Applications to submit</h4>
              {typeof errors.applications === 'string' && (
                <ErrorMessage
                  component="div"
                  name="applications"
                  className="text-xs text-red-ff3b30 mt-1"
                />
              )}
              <FieldArray name="applications" component={FieldArrayForm} />
            </div>

            <div className="mt-6 text-center">
              <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
                Submit applications
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </Dialog.Panel>
  )
}

const FieldArrayForm = (props: FieldArrayRenderProps | string | void) => {
  const { form, remove, push } = props as FieldArrayRenderProps
  const values = form.values as TFormValues
  const { user } = useUser()
  const setModal = useSetRecoilState(appModalStateAtom)

  const onDaoNameChange = (option: any, index: number) => {
    const name = option?.value.name || ''
    const version = option?.value.version || ''
    form.setFieldValue(`applications.${index}.dao_name`, name, true)
    form.setFieldValue(`applications.${index}.dao_version`, version, true)
    form.setFieldValue(`applications.${index}.repo_names`, [], true)
  }

  const onRepoNameChange = (option: any, index: number) => {
    const names: string[] = option.map((item: any) => item.value.name)
    form.setFieldValue(`applications.${index}.repo_names`, names, true)
  }

  return (
    <>
      <div className="flex flex-col divide-y divide-gray-e6edff">
        <AnimatePresence>
          {values.applications.map((_, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              exit={{ opacity: 0, transition: { duration: 0.4 } }}
              className={classNames(
                'flex items-center gap-x-6 py-3',
                index === 0 ? 'mt-4' : null,
              )}
            >
              <div className="grow">
                <div className="mb-2">
                  <Field name={`applications.${index}.dao_name`} component={BaseField}>
                    <UserSelect
                      placeholder="DAO name"
                      isDisabled={form.isSubmitting}
                      searchUser={false}
                      searchDaoGlobal
                      searchDaoIsMember={user.profile}
                      onChange={(option) => {
                        onDaoNameChange(option, index)
                      }}
                    />
                  </Field>
                  <ErrorMessage
                    className="text-xs text-red-ff3b30 mt-0.5"
                    component="div"
                    name={`applications.${index}.dao_name`}
                  />
                </div>
                <div>
                  <Field name={`applications.${index}.dao_name`} component={BaseField}>
                    <AsyncSelect
                      classNames={Select2ClassNames}
                      isClearable
                      isMulti
                      isDisabled={
                        form.isSubmitting || !values.applications[index].dao_name
                      }
                      cacheOptions={false}
                      defaultOptions={false}
                      loadOptions={(input) => {
                        return getRepositoryOptions({
                          application: values.applications[index],
                          input,
                        })
                      }}
                      formatOptionLabel={(data) => <div>{data.label}</div>}
                      placeholder="Select one or multiple repositories"
                      onChange={(option) => {
                        onRepoNameChange(option, index)
                      }}
                    />
                  </Field>
                  <ErrorMessage
                    className="text-xs text-red-ff3b30 mt-0.5"
                    component="div"
                    name={`applications.${index}.repo_names`}
                  />
                </div>
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

      <div className="mt-4">
        <Button
          type="button"
          variant="custom"
          size="sm"
          className="block border !border-blue-2b89ff text-blue-2b89ff !rounded-[2rem]"
          disabled={form.isSubmitting}
          onClick={() => push('0')}
        >
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          Add application from existing DAO
        </Button>
      </div>

      <div className="mt-4">
        <ButtonLink
          to={'/a/orgs/create'}
          variant="custom"
          size="sm"
          className="border !border-blue-2b89ff text-blue-2b89ff !rounded-[2rem]"
          onClick={() => {
            setModal((state) => ({ ...state, element: null, isOpen: false }))
          }}
        >
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          Create new DAO
        </ButtonLink>
      </div>
    </>
  )
}

export { HackathonApplicationSubmit }
