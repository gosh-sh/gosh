import { useState } from 'react'
import {
  ErrorMessage,
  Field,
  FieldArray,
  FieldArrayRenderProps,
  Form,
  Formik,
} from 'formik'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTimes } from '@fortawesome/free-solid-svg-icons'
import { Button } from '../../../../../components/Form'
import { Select2ClassNames } from '../../../../../helpers'
import AsyncSelect from 'react-select/async'
import yup from '../../../../yup-extended'
import successImage from '../../../../../assets/images/success.png'
import { AppConfig } from '../../../../../appconfig'
import { AnimatePresence, motion } from 'framer-motion'
import { useCreateDaoMember } from '../../../../hooks/dao.hooks'
import { BaseField } from '../../../../../components/Formik'

const getUsernameOptions = async (input: string) => {
  const options: any[] = []
  const profileQuery = await AppConfig.goshroot.getUserProfile({
    username: input.toLowerCase(),
  })
  if (await profileQuery.isDeployed()) {
    options.push({ label: input.toLowerCase(), value: input.toLowerCase() })
  }

  return options
}

const FieldArrayForm = (props: FieldArrayRenderProps | string | void) => {
  const { form, remove, push } = props as FieldArrayRenderProps
  const values = form.values as TFormValues

  return (
    <AnimatePresence>
      {values.members.map((value, index) => (
        <motion.div
          key={value._id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
        >
          <div className="py-2">
            <div>
              <Field name={`members.${index}.username`} component={BaseField}>
                <AsyncSelect
                  classNames={Select2ClassNames}
                  isClearable
                  placeholder="Input username"
                  cacheOptions={false}
                  defaultOptions={false}
                  loadOptions={getUsernameOptions}
                  onChange={(option) => {
                    const _value = option ? option.value : ''
                    form.setFieldValue(
                      `members.${index}`,
                      { _id: value._id, username: _value },
                      true,
                    )
                  }}
                  isDisabled={form.isSubmitting}
                />
              </Field>
              <ErrorMessage
                className="text-xs text-red-ff3b30 mt-1"
                component="div"
                name={`members.${index}.username`}
              />
            </div>

            <div className="text-right mt-2">
              <Button
                type="button"
                variant="custom"
                className="!p-0 py-1 text-sm text-gray-7c8db5"
                disabled={form.isSubmitting}
                onClick={() => remove(index)}
              >
                <FontAwesomeIcon icon={faTimes} size="lg" className="mr-2" />
                Remove
              </Button>
            </div>
          </div>
        </motion.div>
      ))}

      <div className="text-gray-7c8db5">
        {values.members.length < 10 && (
          <button
            type="button"
            disabled={form.isSubmitting}
            onClick={() => push({ _id: `${Math.random()}`, username: '' })}
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Add member
          </button>
        )}
      </div>
    </AnimatePresence>
  )
}

type TFormValues = {
  members: { _id: string; username: string }[]
}

const MemberAddForm = () => {
  const { createMember } = useCreateDaoMember()
  const [transition, setTransition] = useState<{ form: boolean; success: boolean }>({
    form: true,
    success: false,
  })

  const onCreateMember = async (values: TFormValues) => {
    try {
      const { members } = values
      await createMember(members.map(({ username }) => username))
      setTransition({ form: false, success: true })
    } catch (e: any) {
      console.error(e.message)
    }
  }

  return (
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
                    _id: yup.string().required(),
                    username: yup.string().required('Field is required'),
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
              <p className="text-gray-7c8db5 text-sm">
                Users invited by GOSH username are added to proposal and waiting for
                voting
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export { MemberAddForm }
