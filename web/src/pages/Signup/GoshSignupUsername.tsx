import { Field, Form, Formik } from 'formik'
import { AppConfig, GoshError, useUser } from 'react-gosh'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import {
    githubRepositoriesSelectedSelector,
    oAuthSessionAtom,
    signupStepAtom,
} from '../../store/signup.state'
import { TextField } from '../../components/Formik'
import Spinner from '../../components/Spinner'
import { SignupProgress } from './SignupProgress'
import { supabase } from '../../helpers'
import { toast } from 'react-toastify'
import ToastError from '../../components/Error/ToastError'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import yup from '../../yup-extended'
import { appModalStateAtom } from '../../store/app.state'
import PinCodeModal from '../../components/Modal/PinCode'
import { useNavigate } from 'react-router-dom'

type TGoshSignupUsernameProps = {
    phrase: string[]
    signoutOAuth(): Promise<void>
}

const GoshSignupUsername = (props: TGoshSignupUsernameProps) => {
    const { phrase, signoutOAuth } = props
    const navigate = useNavigate()
    const setModal = useSetRecoilState(appModalStateAtom)
    const { session } = useRecoilValue(oAuthSessionAtom)
    const githubReposSelected = useRecoilValue(githubRepositoriesSelectedSelector)
    const setStep = useSetRecoilState(signupStepAtom)
    const { signup, signupProgress } = useUser()

    const getDbUser = async (username: string) => {
        const { data, error } = await supabase
            .from('users')
            .select()
            .eq('gosh_username', username)
            .single()
        if (error?.code === 'PGRST116') return null
        if (error) {
            throw new GoshError(error.message)
        }
        return data
    }

    const createDbUser = async (username: string, pubkey: string, authUserId: string) => {
        const { data, error } = await supabase
            .from('users')
            .insert({
                gosh_username: username,
                gosh_pubkey: `0x${pubkey}`,
                auth_user: authUserId,
            })
            .select()
            .single()
        if (error) {
            throw new GoshError(error.message)
        }
        return data
    }

    const onFormSubmit = async (values: { username: string }) => {
        try {
            if (!session) {
                throw new GoshError('Session undefined')
            }

            // Prepare data
            const username = values.username.trim()
            const seed = phrase.join(' ')
            const keypair = await AppConfig.goshclient.crypto.mnemonic_derive_sign_keys({
                phrase: seed,
            })

            // Get or create DB user
            let dbUser = await getDbUser(username)
            if (!dbUser) {
                dbUser = await createDbUser(username, keypair.public, session.user.id)
            }

            // Save auto clone repositories
            const { error } = await supabase.from('github').insert(
                githubReposSelected.map(([githubUrl, goshUrl]) => ({
                    user_id: dbUser.id,
                    github_url: githubUrl,
                    gosh_url: goshUrl,
                })),
            )
            if (error) {
                throw new GoshError(error.message)
            }

            // Deploy GOSH account
            await signup({ phrase: seed, username })
            await signoutOAuth()
            setStep({ index: 4, data: { username, email: session.user.email } })

            // Create PIN-code
            setModal({
                static: true,
                isOpen: true,
                element: (
                    <PinCodeModal
                        phrase={seed}
                        onUnlock={() => navigate('/a/orgs', { replace: true })}
                    />
                ),
            })
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    return (
        <div className="signup signup--username">
            <div className="signup__aside signup__aside--step aside-step">
                <div className="aside-step__header">
                    <div className="aside-step__btn-back">
                        <button type="button" onClick={() => setStep({ index: 2 })}>
                            <FontAwesomeIcon icon={faArrowLeft} />
                        </button>
                    </div>
                    <span className="aside-step__title">Back</span>
                </div>
                <p className="aside-step__text">Choose a short nickname</p>
                <p className="aside-step__text-secondary">or create a new one</p>
            </div>

            <div className="signup__content">
                <div className="signup__nickname-form nickname-form">
                    <p className="nickname-form__title">
                        {session?.user.user_metadata.user_name}
                    </p>
                    <p className="nickname-form__subtitle">your GOSH nickname</p>

                    <Formik
                        initialValues={{
                            username: session?.user.user_metadata.user_name,
                            isConfirmed: false,
                        }}
                        onSubmit={onFormSubmit}
                        validationSchema={yup.object().shape({
                            username: yup
                                .string()
                                .username()
                                .required('Username is required'),
                        })}
                    >
                        {({ isSubmitting, setFieldValue }) => (
                            <Form>
                                <div className="mb-3">
                                    <Field
                                        name="username"
                                        component={TextField}
                                        inputProps={{
                                            autoComplete: 'off',
                                            placeholder: 'Username',
                                            onChange: (e: any) =>
                                                setFieldValue(
                                                    'username',
                                                    e.target.value.toLowerCase(),
                                                ),
                                        }}
                                        help={
                                            <>
                                                <p>GOSH username</p>
                                                <p>
                                                    Can be changed, if is already taken or
                                                    you prefer another
                                                </p>
                                            </>
                                        }
                                    />
                                </div>

                                <div className="nickname-form__submit">
                                    <button type="submit" disabled={isSubmitting}>
                                        {isSubmitting && <Spinner size={'lg'} />}
                                        Create account
                                    </button>
                                </div>
                            </Form>
                        )}
                    </Formik>

                    <SignupProgress progress={signupProgress} className="mt-4" />
                </div>
            </div>
        </div>
    )
}

export default GoshSignupUsername
