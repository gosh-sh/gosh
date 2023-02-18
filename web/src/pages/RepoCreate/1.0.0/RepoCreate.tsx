import { Field, Form, Formik } from 'formik'
import { FormikInput } from '../../../components/Formik'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { TDaoLayoutOutletContext } from '../../DaoLayout'
import { useRepoCreate } from 'react-gosh'
import { toast } from 'react-toastify'
import ToastError from '../../../components/Error/ToastError'
import yup from '../../../yup-extended'
import { Button } from '../../../components/Form'

type TFormValues = {
    name: string
}

const RepoCreatePage_1_0_0 = () => {
    const navigate = useNavigate()
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const { create: createRepository } = useRepoCreate(dao.adapter)

    const onRepoCreate = async (values: TFormValues) => {
        try {
            await createRepository(values.name, {})
            navigate(`/o/${dao.details.name}/r/${values.name}`, { replace: true })
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    return (
        <div className="max-w-lg px-7 py-8 mx-auto">
            <h1 className="font-medium text-3xl text-center mb-14">
                Create new repository
            </h1>

            <Formik
                initialValues={{ name: '' }}
                onSubmit={onRepoCreate}
                validationSchema={yup.object().shape({
                    name: yup.string().reponame().required('Name is required'),
                })}
            >
                {({ isSubmitting, setFieldValue }) => (
                    <Form>
                        <div className="mb-6">
                            <Field
                                name="name"
                                component={FormikInput}
                                autoComplete="off"
                                placeholder="Repository name"
                                disabled={isSubmitting}
                                onChange={(e: any) =>
                                    setFieldValue('name', e.target.value.toLowerCase())
                                }
                            />
                        </div>

                        <div>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                isLoading={isSubmitting}
                                className="w-full"
                            >
                                Create repository
                            </Button>
                        </div>
                    </Form>
                )}
            </Formik>
        </div>
    )
}

export default RepoCreatePage_1_0_0
