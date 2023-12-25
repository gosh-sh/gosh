import { Field, Form, Formik } from 'formik'
import * as Yup from 'yup'
import { Button } from '../../../components/Form'

type TSigninProfileFormProps = {
  profiles: { pubkey: string; name: string; profile: string }[]
  onSubmit(values: { username: string }): Promise<void>
}

const SigninProfileForm = (props: TSigninProfileFormProps) => {
  const { profiles, onSubmit } = props

  return (
    <>
      <div className="text-center text-gray-7c8db5 mt-4 mb-5">
        We found multiple profiles for your keys, please, select one
      </div>

      <Formik
        initialValues={{ username: '' }}
        validationSchema={Yup.object().shape({
          username: Yup.string()
            .max(64, 'Max length is 64 characters')
            .required('Username is required'),
        })}
        onSubmit={onSubmit}
      >
        {({ isSubmitting, values }) => (
          <Form className="px-4 text-center">
            <div className="mb-3">
              <Field
                name="username"
                component={'select'}
                className="px-3 py-2 rounded-md border focus:outline-none"
                disabled={isSubmitting}
              >
                <option value="">Select profile</option>
                {profiles?.map((item, index) => (
                  <option key={index} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </Field>
            </div>

            <div className="mt-6">
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting || !values.username}
                isLoading={isSubmitting}
              >
                Continue
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </>
  )
}

export default SigninProfileForm
