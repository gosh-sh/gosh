import { Field, Form, Formik } from 'formik'
import { FormikInput, FormikTextarea } from '../../../components/Formik'
import { useNavigate } from 'react-router-dom'
import yup from '../../yup-extended'
import { Button } from '../../../components/Form'
import { useCreateDao } from '../../hooks/dao.hooks'

type TFormValues = {
  name: string
  members: string
}

const DaoCreatePage = () => {
  const navigate = useNavigate()
  const { createDao } = useCreateDao()

  const onDaoCreate = async (values: TFormValues) => {
    const { name, members } = values
    try {
      await createDao(name, members.split('\n'))
      navigate(`/o/${name}`)
    } catch (e: any) {
      console.error(e.message)
    }
  }

  return (
    <div className="max-w-md mx-auto border border-gray-e6edff rounded-xl py-6 px-10">
      <h1 className="font-medium text-2xl text-center mb-10">Create new organization</h1>

      <Formik
        initialValues={{
          name: '',
          members: '',
        }}
        onSubmit={onDaoCreate}
        validationSchema={yup.object().shape({
          name: yup.string().daoname().required('Name is required'),
        })}
        enableReinitialize
      >
        {({ isSubmitting, setFieldValue }) => (
          <Form>
            <div>
              <Field
                label="Name"
                name="name"
                component={FormikInput}
                placeholder="New organization name"
                autoComplete="off"
                disabled={isSubmitting}
                onChange={(e: any) => setFieldValue('name', e.target.value.toLowerCase())}
                test-id="input-dao-name"
              />
            </div>

            <div className="mt-6">
              <Field
                label="Add members (optional)"
                name="members"
                component={FormikTextarea}
                placeholder="Username(s)"
                autoComplete="off"
                disabled={isSubmitting}
                rows={5}
                onChange={(e: any) =>
                  setFieldValue('members', e.target.value.toLowerCase())
                }
                help="Put each username from new line"
                test-id="input-dao-members"
              />
            </div>

            <div className="mt-6 text-center">
              <Button
                type="submit"
                disabled={isSubmitting}
                isLoading={isSubmitting}
                test-id="btn-dao-create"
              >
                Create organization
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  )
}

export default DaoCreatePage
