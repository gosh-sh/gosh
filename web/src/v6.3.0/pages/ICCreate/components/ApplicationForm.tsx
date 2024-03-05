import { Button } from '../../../../components/Form'
import {
  ApplicationForm as ApplicationFormCommon,
  useApplicationFormContext,
} from '../../../components/ApplicationForm'
import { useCreateIC } from '../../../hooks/ic.hooks'
import { EICCreateStep } from '../../../types/ic.types'

const ApplicationForm = (props: { index: number }) => {
  const { index } = props
  const {
    state,
    setStep,
    updateApplicationFormFields,
    updateApplicationFormValues,
    submitApplicationForm,
  } = useCreateIC()
  const app_form = state.forms[index]

  const onBackClick = () => {
    if (index === 0) {
      setStep(EICCreateStep.DOCUMENTS)
    } else {
      setStep(EICCreateStep.FORMS, { index: index - 1 })
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      <ApplicationFormCommon
        form={app_form.form}
        onTemplateChange={async (updated) => {
          updateApplicationFormFields({ ...app_form, form: updated }, index)
        }}
        onValuesChange={async (values) => {
          updateApplicationFormValues(values, index)
        }}
        onSubmit={async (values) => {
          await submitApplicationForm(values, index)
        }}
      >
        <div className="flex flex-col space-y-2">
          <ApplicationFormCommon.Fields />
        </div>

        <FormFooterButtons onBackClick={onBackClick} />
      </ApplicationFormCommon>
    </div>
  )
}

const FormFooterButtons = (props: { onBackClick(): void }) => {
  const { onBackClick } = props
  const {
    formik: { isSubmitting },
  } = useApplicationFormContext()

  return (
    <div className="mt-6 flex items-center justify-between">
      <Button
        type="button"
        variant="outline-secondary"
        disabled={isSubmitting}
        onClick={onBackClick}
      >
        Back
      </Button>
      <Button
        type="submit"
        className="ml-auto"
        disabled={isSubmitting}
        isLoading={isSubmitting}
      >
        Next
      </Button>
    </div>
  )
}

export { ApplicationForm }
