import { Field, Form, Formik } from 'formik'
import { useSetRecoilState } from 'recoil'
import yup from '../../../yup-extended'
import { PinCodeModal } from '../../../components/Modal'
import { appModalStateAtom } from '../../../../store/app.state'
import { TOAuthSession } from '../../../types/oauth.types'
import PreviousStep from './PreviousStep'
import { FormikInput } from '../../../../components/Formik'
import { Button } from '../../../../components/Form'
import Alert from '../../../../components/Alert'
import { useOnboardingData, useOnboardingSignup } from '../../../hooks/onboarding.hooks'

type TGoshUsernameProps = {
  oauth: TOAuthSession
  signoutOAuth(): Promise<void>
}

const GoshUsername = (props: TGoshUsernameProps) => {
  const { oauth, signoutOAuth } = props
  const { data, updateData } = useOnboardingData(oauth)
  const { signup } = useOnboardingSignup(oauth)
  const setModal = useSetRecoilState(appModalStateAtom)

  const onBackClick = () => {
    updateData({ step: 'phrase' })
  }

  const onFormSubmit = async (values: { username: string }) => {
    try {
      // Signup with onboarding
      const username = values.username.trim().toLowerCase()
      const seed = data.phrase.join(' ')
      const isAllValid = await signup(username)

      // Create PIN-code
      setModal({
        static: true,
        isOpen: true,
        element: (
          <PinCodeModal
            phrase={seed}
            onUnlock={async () => {
              if (isAllValid) {
                await signoutOAuth()
              }
              updateData({
                step: 'complete',
                username,
                email: oauth.session!.user.email!,
                redirectTo: isAllValid ? '/a/orgs' : '/onboarding/status',
              })
            }}
          />
        ),
      })
    } catch (e: any) {
      console.error(e.message)
    }
  }

  return (
    <div className="flex flex-wrap items-start">
      <div className="basis-1/2 p-0 lg:p-16">
        <div className="mb-6">
          <PreviousStep onClick={onBackClick} />
        </div>
        <div className="mb-4 text-3xl font-medium">Choose a short nickname</div>
        <div className="text-gray-53596d">or create a new one</div>
      </div>

      <div className="grow basis-0 px-20">
        <div className="border border-gray-e6edff rounded-xl p-8">
          <div className="text-2xl text-center text-blue-348eff font-medium mb-1">
            {oauth.session?.user.user_metadata.user_name}
          </div>
          <div className="text-gray-53596d text-center mb-8">your GOSH nickname</div>

          <Formik
            initialValues={{
              username: (oauth.session?.user.user_metadata.user_name || '').toLowerCase(),
              isConfirmed: false,
            }}
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
                    help={
                      <>
                        <p>GOSH username</p>
                        <p>Can be changed, if is already taken or you prefer another</p>
                      </>
                    }
                  />
                </div>

                <Alert variant="danger" className="mt-5">
                  <div className="text-xs">
                    This is your unique cryptographic identifier in Gosh. <br />
                    Please note that after creating your username it will be impossible to
                    change it in the future
                  </div>
                </Alert>

                <div className="mt-8 text-center">
                  <Button
                    type="submit"
                    size="xl"
                    disabled={isSubmitting}
                    isLoading={isSubmitting}
                  >
                    Create account
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </div>
  )
}

export default GoshUsername
