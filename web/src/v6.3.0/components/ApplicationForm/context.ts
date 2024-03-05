import { FormikProps } from 'formik'
import { ChangeEvent, createContext, useContext } from 'react'
import { TFormGeneratorForm } from '../../types/form.types'

type TApplicationFormContextProps = {
  form: TFormGeneratorForm
  formik: FormikProps<any>
  onFieldChange(e: ChangeEvent<any>): void
}

export const ApplicationFormContext = createContext<TApplicationFormContextProps | null>(
  null,
)

export function useApplicationFormContext() {
  const context = useContext(ApplicationFormContext)
  if (!context) {
    throw new Error(
      'useApplicationFormContext must be used within a ApplicationFormContext.Provider',
    )
  }
  return context
}
