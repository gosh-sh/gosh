import { Field, Form, Formik } from 'formik'
import * as Yup from 'yup'
import { TextareaField } from '../../components/Formik'
import Spinner from '../../components/Spinner'

type TSigninPhraseFormProps = {
    onSubmit(values: { phrase: string }): Promise<void>
}

const SigninPhraseForm = (props: TSigninPhraseFormProps) => {
    const { onSubmit } = props

    return (
        <>
            <div className="px-9 sm:px-2 mt-0 sm:mt-2 mb-10 text-center text-gray-606060 text-lg sm:text-xl leading-normal">
                Please, write your seed phrase
            </div>

            <Formik
                initialValues={{ phrase: '' }}
                onSubmit={onSubmit}
                validationSchema={Yup.object().shape({
                    phrase: Yup.string().required('Phrase is required'),
                })}
            >
                {({ isSubmitting }) => (
                    <Form className="px-5 sm:px-124px">
                        <div>
                            <Field
                                name="phrase"
                                component={TextareaField}
                                errorEnabled={false}
                                inputProps={{
                                    className: '!px-7 !py-6',
                                    autoComplete: 'off',
                                    placeholder: 'Seed phrase',
                                }}
                            />
                        </div>

                        <div className="mt-6">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="btn btn--body w-full py-3 text-xl leading-normal"
                            >
                                {isSubmitting && <Spinner className="mr-3" size={'lg'} />}
                                Sign in
                            </button>
                        </div>
                    </Form>
                )}
            </Formik>
        </>
    )
}

export default SigninPhraseForm
