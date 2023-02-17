import { Field, Form, Formik, FormikHelpers } from 'formik'
import { useTopic } from 'react-gosh'
import { useOutletContext, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import ToastError from '../../components/Error/ToastError'
import { Button } from '../../components/Form'
import { FormikTextarea } from '../../components/Formik'
import Loader from '../../components/Loader'
import yup from '../../yup-extended'
import { TDaoLayoutOutletContext } from '../DaoLayout'

type TMessageFormValues = {
    message: string
    answerId?: string
}

const TopicPage = () => {
    const { topic } = useParams()
    const { dao } = useOutletContext<TDaoLayoutOutletContext>()
    const { data, messages, sendMessage } = useTopic(dao.adapter, topic!)

    const onMessageSend = async (
        values: TMessageFormValues,
        helpers: FormikHelpers<TMessageFormValues>,
    ) => {
        try {
            await sendMessage(values)
            helpers.resetForm()
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    return (
        <>
            {data.isFetching && <Loader>Loading topic...</Loader>}
            <h1 className="text-xl font-medium mb-3">{data.topic?.name}</h1>
            <div className="text-gray-7c8db5">{data.topic?.content}</div>

            <div className="my-6">
                <Formik
                    initialValues={{ message: '' }}
                    onSubmit={onMessageSend}
                    validationSchema={yup.object().shape({
                        message: yup.string().required(),
                    })}
                >
                    {({ isSubmitting }) => (
                        <Form>
                            <div>
                                <Field
                                    component={FormikTextarea}
                                    name="message"
                                    placeholder="Write your message"
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
                                    Send message
                                </Button>
                            </div>
                        </Form>
                    )}
                </Formik>
            </div>

            <div className="divide-y divide-gray-e6edff">
                {messages.map((item, index) => (
                    <div key={index} className="py-3">
                        <div className="mb-2 text-gray-7c8db5 text-sm">Author</div>
                        <div>{item.message}</div>
                    </div>
                ))}
            </div>
        </>
    )
}

export default TopicPage
