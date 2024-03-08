import { faPlus, faTimes } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import classNames from 'classnames'
import copyClipboard from 'copy-to-clipboard'
import {
  ErrorMessage,
  Field,
  FieldArray,
  FieldArrayRenderProps,
  Form,
  Formik,
} from 'formik'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AsyncCreatableSelect from 'react-select/async-creatable'
import { toast } from 'react-toastify'
import successImage from '../../../../../assets/images/success.png'
import Alert from '../../../../../components/Alert/Alert'
import { MemberIcon } from '../../../../../components/Dao'
import { Button } from '../../../../../components/Form'
import { BaseField, FormikInput, FormikTextarea } from '../../../../../components/Formik'
import { ToastError } from '../../../../../components/Toast'
import {
  Select2ClassNames,
  ToastOptionsShortcuts,
  getUsernameByEmail,
} from '../../../../../helpers'
import { validateEmail } from '../../../../../validators'
import { getSystemContract } from '../../../../blockchain/helpers'
import { useCreateDaoMember, useDao } from '../../../../hooks/dao.hooks'
import yup from '../../../../yup-extended'

const getUsernameOptions = async (input: string) => {
  const sc = getSystemContract()

  if (input.indexOf('@') >= 0) {
    const username = await getUsernameByEmail(input)
    if (username) {
      return username.map((item) => ({
        label: item,
        value: { name: item, type: 'user' },
      }))
    }
    return []
  }

  const options: any[] = []
  const profileQuery = await sc.getUserProfile({ username: input.toLowerCase() })
  if (await profileQuery.isDeployed()) {
    options.push({
      label: input.toLowerCase(),
      value: { name: input.toLowerCase(), type: 'user' },
    })
  }

  const daoQuery = await sc.getDao({ name: input })
  if (await daoQuery.isDeployed()) {
    options.push({
      label: input,
      value: { name: input, type: 'dao' },
    })
  }

  return options
}

const FieldArrayForm = (props: FieldArrayRenderProps | string | void) => {
  const { form, remove, push } = props as FieldArrayRenderProps
  const values = form.values as TFormValues
  const dao = useDao()

  return (
    <>
      <div className="divide-y divide-gray-e6edff">
        <AnimatePresence>
          {values.members.map((value, index) => (
            <motion.div
              key={value._id}
              className={classNames(index === 0 ? 'pb-6' : 'py-6')}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              exit={{ opacity: 0, transition: { duration: 0.4 } }}
            >
              <div className="text-right">
                <Button
                  type="button"
                  variant="custom"
                  className="!p-0 py-1 text-xs text-gray-7c8db5"
                  disabled={form.isSubmitting}
                  onClick={() => remove(index)}
                >
                  <FontAwesomeIcon icon={faTimes} className="mr-2" />
                  Remove
                </Button>
              </div>

              <div className="mt-2">
                <Field name={`members.${index}.username`} component={BaseField}>
                  <AsyncCreatableSelect
                    classNames={Select2ClassNames}
                    isClearable={true}
                    placeholder="Input username or email"
                    cacheOptions={false}
                    defaultOptions={false}
                    loadOptions={getUsernameOptions}
                    formatOptionLabel={(data) => {
                      return (
                        <div>
                          <MemberIcon type={data.value.type} size="sm" className="mr-2" />
                          {data.label}
                        </div>
                      )
                    }}
                    formatCreateLabel={(input) => {
                      return `Send invitation to ${input}`
                    }}
                    isValidNewOption={(input) => {
                      return !!input && validateEmail(input)
                    }}
                    getNewOptionData={(input, label) => {
                      return {
                        label,
                        value: {
                          name: input,
                          type: 'email',
                        },
                      }
                    }}
                    onChange={(value) => {
                      form.setFieldValue(
                        `members.${index}.username`,
                        value ? value.value.name : '',
                        true,
                      )
                      form.setFieldValue(
                        `members.${index}.type`,
                        value ? value.value.type : '',
                        true,
                      )
                    }}
                    isDisabled={form.isSubmitting}
                  />
                </Field>
                <ErrorMessage
                  className="text-xs text-red-ff3b30 mt-0.5"
                  component="div"
                  name={`members.${index}.username`}
                />
              </div>

              <div className="mt-3">
                <Field
                  name={`members.${index}.allowance`}
                  component={FormikInput}
                  placeholder="Karma"
                  autoComplete="off"
                  help={`DAO reserve ${dao.details.supply?.reserve.toLocaleString()}`}
                  disabled={form.isSubmitting}
                />
                <ErrorMessage
                  className="text-xs text-red-ff3b30 mt-1"
                  component="div"
                  name={`members.${index}.allowance`}
                />
              </div>

              <div className="mt-3">
                <Field
                  name={`members.${index}.comment`}
                  component={FormikTextarea}
                  placeholder="Comment your decision"
                  autoComplete="off"
                  maxRows={3}
                  disabled={form.isSubmitting}
                />
                <ErrorMessage
                  className="text-xs text-red-ff3b30 mt-1"
                  component="div"
                  name={`members.${index}.comment`}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="text-gray-7c8db5">
        {values.members.length < 10 && (
          <button
            type="button"
            disabled={form.isSubmitting}
            onClick={() =>
              push({
                _id: `${Math.random()}`,
                username: '',
                type: 'user',
                allowance: '',
                comment: '',
              })
            }
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Add member
          </button>
        )}
      </div>
    </>
  )
}

type TFormValues = {
  members: {
    _id: string
    username: string
    type: 'user' | 'dao' | 'email'
    allowance: string
    comment: string
  }[]
}

const MemberAddForm = () => {
  const navigate = useNavigate()
  const dao = useDao()
  const { createMember, createInvitation } = useCreateDaoMember()
  const [transition, setTransition] = useState<{ form: boolean; success: boolean }>({
    form: true,
    success: false,
  })

  const onCreateMember = async (values: TFormValues) => {
    try {
      const { members } = values
      const args = members.map((item) => ({
        user: { name: item.username, type: item.type },
        allowance: parseInt(item.allowance),
        comment: item.comment,
      }))
      const { eventaddr } = await createMember(args)
      setTransition({ form: false, success: true })
      if (eventaddr) {
        navigate(`/o/${dao.details.name}/events/${eventaddr}`)
      }
    } catch (e: any) {
      console.error(e.message)
    }
  }

  const onCreateInvitationLink = async () => {
    try {
      const token = await createInvitation()
      const copyResult = copyClipboard(
        `${window.location.origin}/o/${dao.details.name}/onboarding?token=${token}`,
        { format: 'text/plain' },
      )
      if (copyResult) {
        toast.success('Copied', ToastOptionsShortcuts.CopyMessage)
      }
    } catch (e: any) {
      console.error(e.message)
      toast.error(<ToastError error={e} />)
    }
  }

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        {transition.form && (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
          >
            <h3 className="text-xl font-medium mb-4">Add user to DAO</h3>
            <Formik
              initialValues={{ members: [] }}
              onSubmit={onCreateMember}
              validationSchema={yup.object().shape({
                members: yup
                  .array()
                  .of(
                    yup.object({
                      username: yup.string().required('Field is required'),
                      allowance: yup
                        .number()
                        .integer()
                        .min(0)
                        .required('Field is required'),
                      comment: yup.string().required('Field is required'),
                    }),
                  )
                  .min(1)
                  .max(10),
              })}
            >
              {({ values, isSubmitting }) => (
                <Form>
                  <FieldArray name="members" component={FieldArrayForm} />
                  <div className="mt-8">
                    <Button
                      className="w-full"
                      type="submit"
                      disabled={isSubmitting || !values.members.length}
                      isLoading={isSubmitting}
                    >
                      Add users
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>

            <hr className="mt-10 mb-6 bg-gray-e6edff" />

            <div>
              <div className="mb-2 text-sm text-gray-7c8db5">
                Or send one-time invitation link to single user
              </div>
              <Formik onSubmit={onCreateInvitationLink} initialValues={{}}>
                {({ isSubmitting }) => (
                  <Form>
                    <Button
                      type="submit"
                      className="w-full"
                      isLoading={isSubmitting}
                      disabled={isSubmitting || !dao.details.isAskMembershipOn}
                    >
                      Get one-time invitation link
                    </Button>

                    {!dao.details.isAskMembershipOn && (
                      <Alert variant="warning" className="mt-2 text-xs">
                        Enable "Allow external users to request DAO membership" option in
                        DAO settings to enable invites by email/link
                      </Alert>
                    )}
                  </Form>
                )}
              </Formik>
            </div>
          </motion.div>
        )}

        {transition.success && (
          <motion.div
            key="success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
            onAnimationComplete={() => {
              setTimeout(() => {
                setTransition({ form: true, success: false })
              }, 7000)
            }}
          >
            <div className="bg-white">
              <div className="max-w-[9.75rem] mx-auto">
                <img src={successImage} alt="Success" className="w-full" />
              </div>
              <div className="mt-6">
                <h3 className="text-xl font-medium text-center mb-4">Success</h3>
                <p className="text-gray-7c8db5 text-sm mb-3">
                  Users invited by email will receive invitation email message
                </p>

                <p className="text-gray-7c8db5 text-sm">
                  Users invited by GOSH username are added to event and waiting for voting
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export { MemberAddForm }
