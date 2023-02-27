import { Field, Form, Formik } from 'formik'
import { FormikInput, FormikTextarea } from '../../../components/Formik'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { GoshError, useDaoCreate } from 'react-gosh'
import DaoCreateProgress from './DaoCreateProgress'
import ToastError from '../../../components/Error/ToastError'
import yup from '../../../yup-extended'
import { Button } from '../../../components/Form'

type TFormValues = {
    name: string
    members: string
}

const DaoCreateForm = () => {
    const navigate = useNavigate()
    const daocreate = useDaoCreate()

    const onDaoCreate = async (values: TFormValues) => {
        try {
            if (!daocreate.create) {
                throw new GoshError('Create DAO is not supported')
            }

            const { name, members } = values
            await daocreate.create(name, { members: members.split('\n') })
            navigate('/a/orgs')
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    return (
        <div className="container my-12">
            <div className="max-w-2xl mx-auto">
                <h1 className="font-medium text-3xl text-center mb-14">
                    Create new organization
                </h1>

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
                                    onChange={(e: any) =>
                                        setFieldValue(
                                            'name',
                                            e.target.value.toLowerCase(),
                                        )
                                    }
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
                                        setFieldValue(
                                            'members',
                                            e.target.value.toLowerCase(),
                                        )
                                    }
                                    help="Put each username from new line"
                                />
                            </div>

                            <div className="mt-6">
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    isLoading={isSubmitting}
                                >
                                    Create organization
                                </Button>
                            </div>
                        </Form>
                    )}
                </Formik>

                <DaoCreateProgress progress={daocreate.progress} className={'mt-4'} />
            </div>
        </div>
    )
}

export default DaoCreateForm
