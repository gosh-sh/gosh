import { useEffect } from 'react'
import { TDao, usePush } from 'react-gosh'
import { IGoshRepositoryAdapter } from 'react-gosh/dist/gosh/interfaces'
import { toast } from 'react-toastify'
import { useRecoilState } from 'recoil'
import { Button } from '../../../components/Form'
import { ToastError } from '../../../components/Toast'
import { appform_atom } from '../../store/appform.state'
import { TApplicationForm, TFormGeneratorForm } from '../../types/form.types'
import {
  ApplicationForm as ApplicationFormCommon,
  useApplicationFormContext,
} from '../ApplicationForm'

const updateFormValues = (
  form: TFormGeneratorForm,
  values: { [name: string]: string },
) => {
  const fields = [...form.fields]
  Object.keys(values).map((name) => {
    const found_index = fields.findIndex((field) => field.name === name)
    if (found_index >= 0) {
      fields[found_index] = { ...fields[found_index], value: values[name] }
    }
  })
  return { ...form, fields }
}

type TApplicationFormProps = {
  dao_details: TDao
  repo_adapter: IGoshRepositoryAdapter
  branch: string
  application_form: TApplicationForm
  onSubmit?(): void
}

const ApplicationForm = (props: TApplicationFormProps) => {
  const { dao_details, repo_adapter, branch, application_form, onSubmit } = props
  const [form, setForm] = useRecoilState(appform_atom)
  const { push } = usePush(dao_details, repo_adapter, branch)

  const updateTemplate = async (updated: TFormGeneratorForm) => {
    setForm(updated)
  }

  const updateValues = async (values: { [name: string]: string }) => {
    setForm((state) => ({ ...state, ...updateFormValues(form, values) }))
  }

  const submit = async (values: { [name: string]: string }) => {
    try {
      const updated = updateFormValues(form, values)
      const blobs = [
        {
          treepath: [application_form.filename, application_form.filename],
          original: JSON.stringify(application_form.form, undefined, 2),
          modified: JSON.stringify(updated, undefined, 2),
        },
      ]
      await push(`Update application form: ${application_form.form.title}`, blobs, {})
      if (onSubmit) {
        onSubmit()
      }
    } catch (e: any) {
      toast.error(
        <ToastError error={{ name: 'Save application form', message: e.message }} />,
      )
      console.error(e.message)
    }
  }

  useEffect(() => {
    if (!form.fields.length) {
      setForm(application_form.form)
    }
  }, [application_form.form])

  if (!form.fields.length) {
    return null
  }
  return (
    <ApplicationFormCommon
      form={form}
      onTemplateChange={updateTemplate}
      onValuesChange={updateValues}
      onSubmit={submit}
    >
      <div className="flex flex-col space-y-2">
        <ApplicationFormCommon.Fields />
      </div>

      <FormFooterButtons />
    </ApplicationFormCommon>
  )
}

const FormFooterButtons = () => {
  const {
    formik: { isSubmitting },
  } = useApplicationFormContext()

  return (
    <div className="mt-6 text-center">
      <Button
        type="submit"
        className="ml-auto"
        disabled={isSubmitting}
        isLoading={isSubmitting}
      >
        Submit changes
      </Button>
    </div>
  )
}

export { ApplicationForm }
