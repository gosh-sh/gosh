import { Field, Form, Formik } from 'formik'
import { Button } from '../../../../components/Form'
import { FormikInput, FormikTextarea } from '../../../../components/Formik'
import { useCreateIC } from '../../../hooks/ic.hooks'
import { EICCreateStep } from '../../../types/ic.types'
import yup from '../../../yup-extended'

type TFormValues = {
  name: string
  description?: string
}

const Repository = () => {
  const { state, setStep, submitRepository } = useCreateIC()

  const onFormSubmit = (values: TFormValues) => {
    submitRepository(values)
  }

  const onBackClick = () => {
    setStep(EICCreateStep.REWARDS)
  }

  return (
    <div className="max-w-sm mx-auto">
      <h4>Create repository</h4>

      <Formik
        initialValues={{
          name: state.repository?.name || '',
          description: state.repository?.description,
        }}
        validationSchema={yup.object().shape({
          name: yup.string().reponame().required('Name is required'),
        })}
        onSubmit={onFormSubmit}
      >
        {({ isSubmitting }) => (
          <Form>
            <div>
              <Field
                name="name"
                component={FormikInput}
                autoComplete="off"
                placeholder="Repository name"
                disabled={isSubmitting}
              />
            </div>

            <div className="mt-4">
              <Field
                name="description"
                component={FormikTextarea}
                autoComplete="off"
                placeholder="Repository description (optional)"
                maxRows={6}
                test-id="input-repo-description"
                disabled={isSubmitting}
              />
            </div>

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
          </Form>
        )}
      </Formik>
    </div>
  )
}

export { Repository }
