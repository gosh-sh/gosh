import { Field, Form, Formik } from 'formik'
import { useSetRecoilState } from 'recoil'
import yup from '../../../yup-extended'
import { toast } from 'react-toastify'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExclamation } from '@fortawesome/free-solid-svg-icons'
import { appModalStateAtom } from '../../../../store/app.state'
import { PinCodeModal } from '../../../components/Modal'
import { ToastError } from '../../../../components/Toast'
import PreviousStep from './PreviousStep'
import { FormikInput } from '../../../../components/Formik'
import { Button } from '../../../../components/Form'
import { useUser } from '../../../hooks/user.hooks'
import classNames from 'classnames'

type TGoshUsernameProps = {
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

const GoshUsername = (props: TGoshUsernameProps) => {
  const { signupState, setSignupState, setStep } = props
  const setModal = useSetRecoilState(appModalStateAtom)
  const { signup } = useUser()

  const onBackClick = () => {
    setStep('phrase')
  }

  const onFormSubmit = async (values: { username: string }) => {
    try {
      // Prepare data
      const username = values.username.trim().toLowerCase()
      const seed = signupState.phrase.join(' ')

      // Deploy GOSH account
      await signup({ phrase: seed, username })
      setSignupState((state) => ({ ...state, username }))

      // Create PIN-code
      setModal({
        static: true,
        isOpen: true,
        element: <PinCodeModal phrase={seed} onUnlock={() => setStep('submit')} />,
      })
    } catch (e: any) {
      console.error(e.message)
      toast.error(<ToastError error={e} />)
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-6 items-center mb-8">
        <PreviousStep onClick={onBackClick} />
        <div>
          <h3 className="text-xl font-medium">Choose a short nickname</h3>
        </div>
      </div>

      <div
        className={classNames(
          'w-full lg:w-1/3 p-5',
          'border border-gray-e6edff rounded-xl',
        )}
      >
        <Formik
          initialValues={{ username: '' }}
          onSubmit={onFormSubmit}
          validationSchema={yup.object().shape({
            username: yup.string().username().required('Username is required'),
          })}
        >
          {({ isSubmitting, setFieldValue }) => (
            <Form>
              <div className="mb-3">
                <Field
                  name="username"
                  component={FormikInput}
                  autoComplete="off"
                  placeholder="Username"
                  onChange={(e: any) =>
                    setFieldValue('username', e.target.value.toLowerCase())
                  }
                  help="GOSH username"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex flex-nowrap mt-5 bg-red-ff3b30/5 px-3 py-2.5 rounded-xl text-red-ff3b30">
                <div>
                  <div className="border border-red-ff3b30 rounded-xl px-4 py-2">
                    <FontAwesomeIcon icon={faExclamation} size="lg" />
                  </div>
                </div>
                <span className="ml-3 text-xs">
                  This is your unique cryptographic identifier in Gosh.
                  <br />
                  Please note that after creating your username it will be impossible to
                  change it in the future
                </span>
              </div>

              <div className="mt-6">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                  isLoading={isSubmitting}
                >
                  Create account and continue
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </>
  )
}

export default GoshUsername
