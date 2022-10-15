import { Field, Form, Formik } from 'formik'
import * as Yup from 'yup'
import TextField from '../../components/FormikForms/TextField'
import { Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import Spinner from '../../components/Spinner'
import { TDaoLayoutOutletContext } from '../DaoLayout'
import { useRepoCreate } from 'react-gosh'
import { toast } from 'react-toastify'
import ToastError from '../../components/Error/ToastError'

type TFormValues = {
    name: string
}

const RepoCreatePage = () => {
    const { daoName } = useParams()
    const navigate = useNavigate()
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const { create: createRepository } = useRepoCreate(dao.adapter)

    const onRepoCreate = async (values: TFormValues) => {
        try {
            await createRepository(values.name)
            navigate(`/o/${daoName}/r/${values.name}`, { replace: true })
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    if (!dao.details.isAuthenticated) return <Navigate to={`/o/${daoName}`} />
    return (
        <div className="container container--full mt-12 mb-5">
            <div className="bordered-block max-w-lg px-7 py-8 mx-auto">
                <h1 className="font-semibold text-2xl text-center mb-8">
                    Create new repository
                </h1>

                <Formik
                    initialValues={{ name: '' }}
                    onSubmit={onRepoCreate}
                    validationSchema={Yup.object().shape({
                        name: Yup.string()
                            .matches(/^[\w-]+$/, 'Name has invalid characters')
                            .max(64, 'Max length is 64 characters')
                            .required('Name is required'),
                    })}
                >
                    {({ isSubmitting, setFieldValue }) => (
                        <Form>
                            <div>
                                <Field
                                    name="name"
                                    component={TextField}
                                    inputProps={{
                                        className: 'w-full',
                                        autoComplete: 'off',
                                        placeholder: 'Repository name',
                                        disabled: isSubmitting,
                                        onChange: (e: any) =>
                                            setFieldValue(
                                                'name',
                                                e.target.value.toLowerCase(),
                                            ),
                                    }}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="btn btn--body px-3 py-3 w-full mt-6"
                            >
                                {isSubmitting && <Spinner className="mr-2" size={'lg'} />}
                                Create repository
                            </button>
                        </Form>
                    )}
                </Formik>
            </div>
        </div>
    )
}

export default RepoCreatePage
