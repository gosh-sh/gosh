import { Field } from 'formik'
import { useState } from 'react'
import Alert from '../../../../components/Alert/Alert'
import { FormikCheckbox } from '../../../../components/Formik'
import PhraseForm from '../../../../components/PhraseForm'
import { useUserSignup } from '../../../hooks/user.hooks'
import yup from '../../../yup-extended'
import { PreviousStep } from './PreviousStep'

const PhraseCreateForm = () => {
  const { data, setPhrase, submitPhraseCreateStep } = useUserSignup()
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const onFormSubmit = async (values: { words: string[] }) => {
    try {
      setIsSubmitting(true)
      await submitPhraseCreateStep(values.words)
    } catch (e: any) {
      console.error(e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-14">
      <div className="basis-full md:basis-6/12 lg:basis-4/12 text-center lg:text-start">
        <div className="mb-6">
          <PreviousStep
            step={!!data.daoinvites.length ? 'daoinvite' : 'username'}
            disabled={isSubmitting}
          />
        </div>
        <div className="mb-8 text-3xl font-medium">Let's set up your GOSH account</div>
        <div className="text-gray-53596d">
          Write down the seed phrase in a safe place or enter an existing one if you
          already have a GOSH account
        </div>
      </div>

      <div className="basis-full md:basis-6/12 lg:basis-5/12 xl:basis-4/12">
        <div className="border border-gray-e6edff rounded-xl p-8">
          <PhraseForm
            initialValues={{
              words: data.phrase,
              isConfirmed: false,
            }}
            validationSchema={yup.object().shape({
              isConfirmed: yup.boolean().oneOf([true], 'You should accept this'),
            })}
            btnGenerate
            btnClear
            btnSubmitContent="Continue"
            onSubmit={onFormSubmit}
            onGenerate={async (words) => setPhrase(words)}
          >
            <Alert variant="danger" className="mt-5">
              <div className="text-xs">
                GOSH cannot reset this phrase! If you forget it, you might lose access to
                your account
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
