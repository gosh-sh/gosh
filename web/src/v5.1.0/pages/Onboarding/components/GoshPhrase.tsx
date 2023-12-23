import { Field } from 'formik'
import { useEffect } from 'react'
import { toast } from 'react-toastify'
import { ToastError } from '../../../../components/Toast'
import { FormikCheckbox } from '../../../../components/Formik'
import PreviousStep from './PreviousStep'
import { AppConfig } from '../../../../appconfig'
import { EGoshError, GoshError } from '../../../../errors'
import PhraseForm from '../../../../components/PhraseForm/PhraseForm'
import { TOAuthSession } from '../../../types/oauth.types'
import { useOnboardingData } from '../../../hooks/onboarding.hooks'
import Alert from '../../../../components/Alert/Alert'
import yup from '../../../yup-extended'

type TGoshPhraseProps = {
  oauth: TOAuthSession
}

const GoshPhrase = (props: TGoshPhraseProps) => {
  const { oauth } = props
  const {
    data: { phrase },
    updateData,
  } = useOnboardingData(oauth)

  const onBackClick = () => {
    updateData({ step: 'organizations' })
  }

  const onFormSubmit = async (values: { words: string[] }) => {
    try {
      const { words } = values
      const { valid } = await AppConfig.goshclient.crypto.mnemonic_verify({
        phrase: words.join(' '),
      })
      if (!valid) {
        throw new GoshError(EGoshError.PHRASE_INVALID)
      }
      updateData({ phrase: words, step: 'phrase-check' })
    } catch (e: any) {
      console.error(e.message)
      toast.error(<ToastError error={e} />)
    }
  }

  useEffect(() => {
    const _setRandomPhrase = async () => {
      const { phrase } = await AppConfig.goshclient.crypto.mnemonic_from_random({})
      updateData({ phrase: phrase.split(' ') })
    }

    if (!phrase.length) {
      _setRandomPhrase()
    }
  }, [phrase])

  return (
    <div className="flex flex-wrap items-start">
      <div className="basis-1/2 p-0 lg:p-16">
        <div className="mb-6">
          <PreviousStep onClick={onBackClick} />
        </div>

        <div className="mb-8 text-3xl font-medium">Let's set up your GOSH account</div>

        <div className="text-gray-53596d">
          Write down the seed phrase in a safe place or enter an existing one if you
          already have a GOSH account
        </div>
      </div>

      <div className="grow basis-0 border border-gray-e6edff rounded-xl p-8">
        <PhraseForm
          initialValues={{
            words: phrase,
            isConfirmed: false,
          }}
          validationSchema={yup.object().shape({
            isConfirmed: yup.boolean().oneOf([true], 'You should accept this'),
          })}
          btnGenerate
          btnClear
          btnSubmitContent="Continue"
          onSubmit={onFormSubmit}
          onGenerate={async (words) => updateData({ phrase: words })}
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
  )
}

export default GoshPhrase
