import { Field } from 'formik'
import { FormikCheckbox } from '../../../../components/Formik'
import Alert from '../../../../components/Alert/Alert'
import yup from '../../../yup-extended'
import PhraseForm from '../../../../components/PhraseForm'
import { PreviousStep } from './PreviousStep'
import { useUserSignup } from '../../../hooks/user.hooks'

const PhraseCreateForm = () => {
    const { data, updatePhrase, updatePhraseCreateStep } = useUserSignup()

    const onFormSubmit = async (values: { words: string[] }) => {
        try {
            await updatePhraseCreateStep(values.words)
        } catch (e: any) {
            console.error(e.message)
        }
    }

    return (
        <div className="flex flex-wrap items-center justify-center gap-14">
            <div className="basis-full lg:basis-4/12 text-center lg:text-start">
                <div className="mb-6">
                    <PreviousStep step="username" />
                </div>

                <div className="mb-8 text-3xl font-medium">
                    Let's set up your GOSH account
                </div>

                <div className="text-gray-53596d">
                    Write down the seed phrase in a safe place or enter an existing one if
                    you already have a GOSH account
                </div>
            </div>

            <div className="basis-full md:basis-8/12 lg:basis-5/12 xl:basis-4/12">
                <div className="border border-gray-e6edff rounded-xl p-8">
                    <PhraseForm
                        initialValues={{
                            words: data.phrase,
                            isConfirmed: false,
                        }}
                        validationSchema={yup.object().shape({
                            isConfirmed: yup
                                .boolean()
                                .oneOf([true], 'You should accept this'),
                        })}
                        btnGenerate
                        btnClear
                        btnSubmitContent="Continue"
                        onSubmit={onFormSubmit}
                        onGenerate={async (words) => updatePhrase(words)}
                    >
                        <Alert variant="danger" className="mt-5">
                            <div className="text-xs">
                                GOSH cannot reset this phrase! If you forget it, you might
                                lose access to your account
                            </div>
                        </Alert>

                        <div className="mt-8 text-center">
                            <Field
                                className="!inline-block"
                                name="isConfirmed"
                                type="checkbox"
                                component={FormikCheckbox}
                                inputProps={{
                                    label: 'I have written phrase carefuly',
                                }}
                            />
                        </div>
                    </PhraseForm>
                </div>
            </div>
        </div>
    )
}

export { PhraseCreateForm }
