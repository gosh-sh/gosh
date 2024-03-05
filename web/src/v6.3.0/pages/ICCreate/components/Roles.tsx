import { Field, Form, Formik } from 'formik'
import { Button } from '../../../../components/Form'
import { BaseField } from '../../../../components/Formik'
import { UserSelect } from '../../../components/UserSelect'
import { useCreateIC } from '../../../hooks/ic.hooks'
import { TUserSelectOption } from '../../../types/form.types'
import yup from '../../../yup-extended'

type TFormValues = {
  scientist: TUserSelectOption[]
  developer: TUserSelectOption[]
  issuer: TUserSelectOption[]
}

const Roles = () => {
  const { state, submitRoles } = useCreateIC()

  const onFormSubmit = (values: TFormValues) => {
    submitRoles({ roles: values })
  }

  return (
    <div className="max-w-sm mx-auto">
      <h4>Add IC roles (select DAO member(s) for each role)</h4>

      <Formik
        initialValues={{
          scientist: state.roles.scientist,
          developer: state.roles.developer,
          issuer: state.roles.issuer,
        }}
        validationSchema={yup.object().shape({
          scientist: yup.array().min(1),
          developer: yup.array().min(1),
          issuer: yup.array().min(1),
        })}
        onSubmit={onFormSubmit}
      >
        {({ values, setFieldValue, isSubmitting }) => (
          <Form>
            <div>
              <Field name="scientist" component={BaseField} label="Scientist">
                <UserSelect
                  placeholder="Username"
                  isMulti
                  value={values.scientist}
                  isDisabled={isSubmitting}
                  onChange={(options) => {
                    setFieldValue('scientist', options)
                  }}
                />
              </Field>
            </div>

            <div className="mt-4">
              <Field name="developer" component={BaseField} label="Developer">
                <UserSelect
                  placeholder="Username"
                  isMulti
                  value={values.developer}
                  isDisabled={isSubmitting}
                  onChange={(options) => {
                    setFieldValue('developer', options)
                  }}
                />
              </Field>
            </div>

            <div className="mt-4">
              <Field name="issuer" component={BaseField} label="Issuer">
                <UserSelect
                  placeholder="Username"
                  isMulti
                  value={values.issuer}
                  isDisabled={isSubmitting}
                  onChange={(options) => {
                    setFieldValue('issuer', options)
                  }}
                />
              </Field>
            </div>

            <div className="mt-6 flex items-center justify-between">
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

export { Roles }
