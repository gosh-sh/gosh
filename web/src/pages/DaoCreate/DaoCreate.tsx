import { Field, Form, Formik } from 'formik'
import * as Yup from 'yup'
import TextField from '../../components/FormikForms/TextField'
import { useNavigate } from 'react-router-dom'
import Spinner from '../../components/Spinner'
import { toast } from 'react-toastify'
import { useDaoCreate } from 'react-gosh'
import DaoCreateProgress from './DaoCreateProgress'
import TextareaField from '../../components/FormikForms/TextareaField'

type TFormValues = {
    name: string
    members: string
}

const DaoCreatePage = () => {
    const navigate = useNavigate()
    const { createDao, progress } = useDaoCreate()

    const onDaoCreate = async (values: TFormValues) => {
        try {
            await createDao(values.name, values.members.split('\n'))
            navigate('/account/orgs')
        } catch (e: any) {
            console.error(e.message)
            toast.error(e.message)
        }
    }

    return (
        <div className="container container--full mt-12 mb-5">
            <div className="bordered-block max-w-lg px-7 py-8 mx-auto">
                <h1 className="font-semibold text-2xl text-center mb-8">
                    Create new organization
                </h1>

                <Formik
                    initialValues={{
                        name: '',
                        members: '',
                    }}
                    onSubmit={onDaoCreate}
                    validationSchema={Yup.object().shape({
                        name: Yup.string()
                            .matches(/^[\w-]+$/, 'Name has invalid characters')
                            .max(64, 'Max length is 64 characters')
                            .required('Name is required'),
                    })}
                    enableReinitialize
                >
                    {({ isSubmitting, setFieldValue }) => (
                        <Form>
                            <div>
                                <Field
                                    label="Name"
                                    name="name"
                                    component={TextField}
                                    inputProps={{
                                        placeholder: 'New organization name',
                                        autoComplete: 'off',
                                        disabled: isSubmitting,
                                        onChange: (e: any) =>
                                            setFieldValue(
                                                'name',
                                                e.target.value.toLowerCase(),
                                            ),
                                    }}
                                />
                            </div>

                            <div className="mt-6">
                                <Field
                                    label="Members"
                                    name="members"
                                    component={TextareaField}
                                    inputProps={{
                                        placeholder: "Members' public keys",
                                        autoComplete: 'off',
                                        disabled: isSubmitting,
                                        rows: 5,
                                    }}
                                    help="Put each public key (0x...) from new line"
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn btn--body px-3 py-3 w-full mt-8"
                                disabled={isSubmitting}
                            >
                                {isSubmitting && <Spinner className="mr-3" size={'lg'} />}
                                Create organization
                            </button>
                        </Form>
                    )}
                </Formik>

                <DaoCreateProgress progress={progress} className={'mt-4'} />
            </div>
        </div>
    )
}

export default DaoCreatePage
