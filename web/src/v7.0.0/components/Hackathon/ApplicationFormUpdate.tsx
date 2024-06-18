import { faPlus, faTimes } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Dialog } from '@headlessui/react'
import {
  ErrorMessage,
  Field,
  FieldArray,
  FieldArrayRenderProps,
  Form,
  Formik,
} from 'formik'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '../../../components/Form'
import { BaseField, FormikInput } from '../../../components/Formik'
import { ModalCloseButton } from '../../../components/Modal'
import { TFormGeneratorField, TUserSelectOption } from '../../types/form.types'
import yup from '../../yup-extended'
import { UserSelect } from '../UserSelect'

type TFormValues = {
  owners: TUserSelectOption[]
  fields: (TFormGeneratorField & { _motion_id: number })[]
}

type THackathonApplicationFormUpdateProps = {
  initial_values: { owners: TUserSelectOption['value'][]; fields: TFormGeneratorField[] }
  onSubmit(params: {
    owners: TUserSelectOption['value'][]
    fields: TFormGeneratorField[]
  }): Promise<void>
}

const HackathonApplicationFormUpdate = (props: THackathonApplicationFormUpdateProps) => {
  const { initial_values, onSubmit } = props

  const onFormSubmit = async (values: TFormValues) => {
    try {
      const owners = values.owners.map(({ value }) => value)
      const fields = values.fields.map((field) => ({
        label: field.label,
        name: field.name,
        type: field.type,
        required: field.required,
      }))
      await onSubmit({ owners, fields })
    } catch (e: any) {
      console.error(e.message)
    }
  }

  return (
    <Dialog.Panel className="relative rounded-xl bg-white p-10 w-full max-w-sm overflow-hidden">
      <Formik
        initialValues={{
          ...initial_values,
          fields: initial_values.fields.map((v) => ({ _motion_id: Math.random(), ...v })),
          owners: initial_values.owners.map((v) => ({ label: v.name, value: v })),
        }}
        validationSchema={yup.object().shape({
          owners: yup.array().min(1),
          fields: yup
            .array()
            .of(yup.object().shape({ label: yup.string().required() }))
            .min(1),
        })}
        onSubmit={onFormSubmit}
      >
        {({ isSubmitting, errors, values, setFieldValue }) => (
          <Form>
            <ModalCloseButton disabled={isSubmitting} />

            <div className="mb-6">
              <Field
                name="owners"
                component={BaseField}
                label="Application form owners"
                help="Only selected users can read application form data"
              >
                <UserSelect
                  placeholder="Username"
                  isDisabled={isSubmitting}
                  isMulti
                  value={values.owners}
                  onChange={(options) => {
                    setFieldValue('owners', options)
                  }}
                />
              </Field>
            </div>

            <div className="mb-6">
              <h4 className="mb-2 text-sm text-gray-7c8db5">Application form fields</h4>
              {typeof errors.fields === 'string' && (
                <ErrorMessage
                  component="div"
                  name="fields"
                  className="text-xs text-red-ff3b30 mt-1"
                />
              )}
              <FieldArray name="fields" component={FieldArrayForm} />
            </div>

            <div className="text-center">
              <Button type="submit" disabled={isSubmitting} isLoading={isSubmitting}>
                Apply changes
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

  const onFieldAdd = () => {
    push({
      _motion_id: Math.random(),
      label: '',
      name: `value${values.fields.length}`,
      type: 'text',
      required: true,
    })
  }

  return (
    <>
      <div className="flex flex-col space-y-3">
        <AnimatePresence>
          {values.fields.map((item, index) => (
            <motion.div
              key={item._motion_id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              exit={{ opacity: 0, transition: { duration: 0.4 } }}
              className="flex items-center gap-x-6"
            >
              <div className="grow">
                <Field
                  name={`fields.${index}.label`}
                  component={FormikInput}
                  placeholder="Field label"
                  autoComplete="off"
                  disabled={form.isSubmitting}
                />
                {Array.isArray(form.errors.fields) && (
                  <ErrorMessage
                    className="text-xs text-red-ff3b30 mt-1"
                    component="div"
                    name={`fields.${index}.label`}
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

export { HackathonApplicationFormUpdate }
