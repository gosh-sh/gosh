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
import { v4 as uuidv4 } from 'uuid'
import { Button } from '../../../components/Form'
import { FormikCheckbox, FormikInput, FormikSelect } from '../../../components/Formik'
import { TFormGeneratorForm } from '../../types/form.types'
import yup from '../../yup-extended'

type TFieldsEditorProps = {
  form: TFormGeneratorForm
  onSubmit(updated: TFormGeneratorForm): Promise<void>
}

const FieldsEditor = (props: TFieldsEditorProps) => {
  const { form, onSubmit } = props

  const onFormSubmit = async (updated: TFormGeneratorForm) => {
    await onSubmit(updated)
  }

  return (
    <Formik
      initialValues={{
        title: form.title,
        fields: form.fields,
      }}
      validationSchema={yup.object().shape({
        title: yup.string().required(),
        fields: yup
          .array()
          .of(yup.object().shape({ label: yup.string().required() }))
          .min(1),
      })}
      onSubmit={onFormSubmit}
    >
      {({ errors }) => (
        <Form>
          <div>
            <Field
              name="title"
              component={FormikInput}
              autoComplete="off"
              label="Form title"
              placeholder="Form title"
            />
          </div>

          <div className="mt-4">
            {typeof errors.fields === 'string' && (
              <ErrorMessage
                component="div"
                name="fields"
                className="text-xs text-red-ff3b30 mt-1"
              />
            )}
            <FieldArray name="fields" component={FieldArrayForm} />
          </div>

          <div className="mt-6 text-center">
            <Button type="submit">Apply changes</Button>
          </div>
        </Form>
      )}
    </Formik>
  )
}

const FieldArrayForm = (props: FieldArrayRenderProps | string | void) => {
  const { form, remove, push } = props as FieldArrayRenderProps
  const values = form.values as TFormGeneratorForm

  const onFieldAdd = () => {
    push({
      label: '',
      name: uuidv4(),
      type: 'text',
      required: true,
    })
  }

  return (
    <>
      <h4 className="mb-2 text-sm text-gray-7c8db5">Form fields</h4>
      <div className="flex flex-col space-y-3">
        <AnimatePresence>
          {values.fields.map((item, index) => (
            <motion.div
              key={item.name}
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
                  disabled={item.static}
                />
                {Array.isArray(form.errors.fields) && (
                  <ErrorMessage
                    className="text-xs text-red-ff3b30 mt-1"
                    component="div"
                    name={`fields.${index}.label`}
                  />
                )}
              </div>

              <div>
                <Field
                  name={`fields.${index}.type`}
                  component={FormikSelect}
                  placeholder="Field type"
                  disabled={item.static}
                >
                  <option value="text">text</option>
                  <option value="textarea">textarea</option>
                </Field>
                {Array.isArray(form.errors.fields) && (
                  <ErrorMessage
                    className="text-xs text-red-ff3b30 mt-1"
                    component="div"
                    name={`fields.${index}.type`}
                  />
                )}
              </div>

              <div>
                <Field
                  type="checkbox"
                  component={FormikCheckbox}
                  name={`fields.${index}.required`}
                  inputProps={{
                    label: 'Required',
                    disabled: item.static,
                  }}
                />
              </div>

              <div className="text-right">
                <Button
                  type="button"
                  variant="custom"
                  className="!p-1 disabled:invisible"
                  disabled={item.static}
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
          onClick={onFieldAdd}
        >
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          Add field
        </Button>
      </div>
    </>
  )
}

export { FieldsEditor }
