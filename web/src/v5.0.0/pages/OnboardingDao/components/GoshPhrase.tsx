import { Field } from 'formik'
import { useCallback, useEffect } from 'react'
import { toast } from 'react-toastify'
import { Link, useLocation } from 'react-router-dom'
import yup from '../../../yup-extended'
import { ToastError } from '../../../../components/Toast'
import PhraseForm from '../../../../components/PhraseForm'
import Alert from '../../../../components/Alert'
import { FormikCheckbox } from '../../../../components/Formik'
import { useUser } from '../../../hooks/user.hooks'
import { AppConfig } from '../../../../appconfig'
import { EGoshError, GoshError } from '../../../../errors'
import classNames from 'classnames'

type TGoshPhraseProps = {
  signupState: {
    phrase: string[]
    username: string
  }
  setSignupState: React.Dispatch<
    React.SetStateAction<{
      phrase: string[]
      username: string
    }>
  >
  setStep: React.Dispatch<
    React.SetStateAction<'username' | 'submit' | 'phrase' | 'phrase-check' | undefined>
  >
}

const GoshPhrase = (props: TGoshPhraseProps) => {
  const { signupState, setSignupState, setStep } = props
  const location = useLocation()
  const { user } = useUser()

  const setRandomPhrase = useCallback(async () => {
    const result = await AppConfig.goshclient.crypto.mnemonic_from_random({})
    setSignupState((state) => ({ ...state, phrase: result.phrase.split(' ') }))
  }, [setSignupState])

  const onFormSubmit = async (values: { words: string[] }) => {
    try {
      const { words } = values
      const { valid } = await AppConfig.goshclient.crypto.mnemonic_verify({
        phrase: words.join(' '),
      })
      if (!valid) {
        throw new GoshError(EGoshError.PHRASE_INVALID)
      }
      setSignupState((state) => ({ ...state, phrase: words }))
      setStep('phrase-check')
    } catch (e: any) {
      console.error(e.message)
      toast.error(<ToastError error={e} />)
    }
  }

  useEffect(() => {
    if (!signupState.phrase.length) {
      setRandomPhrase()
    }
  }, [signupState.phrase, setRandomPhrase])

  return (
    <>
      <div className="mb-8">
        <h3 className="text-xl font-medium">Let's set up your GOSH account</h3>
        <div className="text-gray-53596d">
          Write down the seed phrase in a safe place or enter an existing one
        </div>
        {!user.profile && (
          <div className="text-xs text-red-ff3b30">
            Note! If you already have GOSH account, you can{' '}
            <Link
              to={`/a/signin?redirect_to=${location.pathname}${location.search}`}
              className="underline"
            >
              sign in
            </Link>
          </div>
        )}
      </div>

      <div
        className={classNames(
          'w-full lg:w-5/12 p-5',
          'border border-gray-e6edff rounded-xl',
        )}
      >
        <PhraseForm
          initialValues={{
            words: signupState.phrase,
            isConfirmed: false,
          }}
          validationSchema={yup.object().shape({
            isConfirmed: yup.boolean().oneOf([true], 'You should accept this'),
          })}
          btnGenerate
          btnClear
          btnSubmitContent="Continue"
          btnSubmitProps={{
            size: 'xl',
          }}
          onSubmit={onFormSubmit}
          onGenerate={setRandomPhrase}
        >
          <Alert variant="danger" className="mt-4 text-xs">
            GOSH cannot reset this phrase! If you forget it, you might lose access to your
            account
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
    </>
  )
}

export default GoshPhrase
