import { FormikInput, FormikTextarea } from '../../../components/Formik'

export const getFormFieldComponent = (type: string) => {
  if (type === 'text') {
    return FormikInput
  }
  if (type === 'textarea') {
    return FormikTextarea
  }
  return FormikInput
}

export const getFormFieldProps = (type: string) => {
  let props = {}
  if (type === 'textarea') {
    props = { ...props, minRows: 3, maxRows: 8 }
  }
  return props
}
