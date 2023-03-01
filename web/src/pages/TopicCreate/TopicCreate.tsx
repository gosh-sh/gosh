import { Field, Form, Formik } from 'formik'
import { useTopicCreate } from 'react-gosh'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { toast } from 'react-toastify'
import ToastError from '../../components/Error/ToastError'
import { Button } from '../../components/Form'
import { FormikInput, FormikTextarea } from '../../components/Formik'
import yup from '../../yup-extended'
import { TDaoLayoutOutletContext } from '../DaoLayout'

type TFormValues = {
    name: string
    content: string
}

const TopicCreatePage = () => {
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const navigate = useNavigate()
    const createTopic = useTopicCreate(dao.adapter)

    const onFormSubmit = async (values: TFormValues) => {
        const { name, content } = values
        try {
            await createTopic({ name, content, object: dao.details.address })
            navigate(`/o/${dao.details.name}/topics`)
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    return (
        <>
            <h1 className="text-xl font-medium mb-10">Create topic</h1>

            <Formik
                initialValues={{ name: '', content: '' }}
                validationSchema={yup.object().shape({
                    name: yup.string().required(),
                    content: yup.string().required(),
                })}
                onSubmit={onFormSubmit}
            >
                {({ isSubmitting }) => (
                    <Form>
                        <div>
                            <Field
                                component={FormikInput}
                                label="Topic name"
                                name="name"
                                placeholder="Topic name"
                                autoComplete="off"
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="mt-4">
                            <Field
                                component={FormikTextarea}
                                label="Topic content"
                                name="content"
                                placeholder="Topic content"
                                autoComplete="off"
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="mt-4">
                            <Button
                                type="submit"
                                isLoading={isSubmitting}
                                disabled={isSubmitting}
                            >
                                Create topic
                            </Button>
                        </div>
                    </Form>
                )}
            </Formik>
        </>
    )
}

export default TopicCreatePage
