import { faPencil } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Dialog } from '@headlessui/react'
import { Field, Form, Formik, FormikHelpers, FormikProps } from 'formik'
import React, { ChangeEvent, useRef } from 'react'
import { useSetRecoilState } from 'recoil'
import { Button } from '../../../components/Form'
import { ModalCloseButton } from '../../../components/Modal'
import { appModalStateAtom } from '../../../store/app.state'
import { TFormGeneratorForm } from '../../types/form.types'
import yup from '../../yup-extended'
import { FieldsEditor } from './FieldsEditor'
import { ApplicationFormContext, useApplicationFormContext } from './context'
import { getFormFieldComponent, getFormFieldProps } from './helpers'

type TApplicationFormProps = {
  children: React.ReactNode
  form: TFormGeneratorForm
  onTemplateChange(form: TFormGeneratorForm): Promise<void>
  onValuesChange(values: { [name: string]: string }): Promise<void>
  onSubmit(values: { [name: string]: string }): Promise<void>
}

const ApplicationForm = (props: TApplicationFormProps) => {
  const { children, form, onTemplateChange, onValuesChange, onSubmit } = props
  const form_ref = useRef<FormikProps<any>>(null)
  const setModal = useSetRecoilState(appModalStateAtom)

  const getFormInitialValues = () => {
    const fields = form.fields.map((field) => [field.name, field.value || ''])
    return Object.fromEntries(fields)
  }

  const getFormValidationSchema = () => {
    const fields = form.fields.map((field) => {
      if (field.required) {
        return [field.name, yup.string().required()]
      }
      return [field.name, yup.string()]
    })
    return yup.object().shape(Object.fromEntries(fields))
  }

  const onFormTemplateEditClick = () => {
    setModal({
      static: false,
      isOpen: true,
      element: (
        <Dialog.Panel className="relative rounded-xl bg-white p-10 w-full max-w-xl overflow-hidden">
          <ModalCloseButton />
          <FieldsEditor
            form={form}
            onSubmit={async (updated) => {
              await onTemplateChange(updated)
              setModal((state) => ({ ...state, isOpen: false }))
            }}
          />
        </Dialog.Panel>
      ),
    })
  }

  const onFieldChange = (e: ChangeEvent<any>) => {
    if (form_ref.current) {
      form_ref.current.handleChange(e)
      const field_name = e.target.getAttribute('name')
      onValuesChange({ ...form_ref.current.values, [field_name]: e.target.value })
    }
  }

  const onFormSubmit = async (values: any, helpers: FormikHelpers<any>) => {
    try {
      await onSubmit(values)
    } catch {
      helpers.setSubmitting(false)
    }
  }

  return (
    <Formik
      innerRef={form_ref}
      initialValues={getFormInitialValues()}
      validationSchema={getFormValidationSchema()}
      enableReinitialize
      onSubmit={onFormSubmit}
    >
      {(props) => (
        <ApplicationFormContext.Provider value={{ form, formik: props, onFieldChange }}>
          <Form>
            <h4>
              {form.title}
              <Button
                type="button"
                variant="link-secondary"
                className="text-xs"
                disabled={props.isSubmitting}
                onClick={onFormTemplateEditClick}
              >
                <FontAwesomeIcon icon={faPencil} className="mr-1" />
                Edit form
              </Button>
            </h4>

            {children}
          </Form>
        </ApplicationFormContext.Provider>
      )}
    </Formik>
  )
}

ApplicationForm.Fields = () => {
  const { form, formik, onFieldChange } = useApplicationFormContext()
  return form.fields.map((field, index) => (
    <div key={index}>
      <Field
        component={getFormFieldComponent(field.type)}
        name={field.name}
        label={field.label}
        autoComplete="off"
        disabled={formik.isSubmitting}
        onChange={onFieldChange}
        {...getFormFieldProps(field.type)}
      />
    </div>
  ))
}

export { ApplicationForm }
