import { Field, Form, Formik } from 'formik'
import { FormikInput, FormikTextarea } from '../../components/Formik'
import { Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import { useRepoCreate } from 'react-gosh'
import { toast } from 'react-toastify'
import ToastError from '../../components/Error/ToastError'
import yup from '../../yup-extended'
import { Button } from '../../components/Form'

type TFormValues = {
    name: string
    description?: string
}

const RepoCreatePage = () => {
    const { daoName } = useParams()
    const navigate = useNavigate()
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const { create: createRepository } = useRepoCreate(dao.adapter)

    const onRepoCreate = async (values: TFormValues) => {
        try {
            await createRepository(values.name, { description: values.description })

            const version = dao.details.version
            if (version === '1.0.0') {
                navigate(`/o/${daoName}/r/${values.name}`, { replace: true })
            } else if (version === '1.1.0') {
                navigate(`/o/${daoName}/events`)
            }
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    if (!dao.details.isAuthenticated) return <Navigate to={`/o/${daoName}`} />
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

                        <div className="mb-6">
                            <Field
                                name="description"
                                component={FormikTextarea}
                                autoComplete="off"
                                placeholder="Repository description (optional)"
                                disabled={isSubmitting}
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            isLoading={isSubmitting}
                            className="w-full"
                        >
                            Create repository
                        </Button>
                    </Form>
                )}
            </Formik>
        </div>
    )
}

export default RepoCreatePage
