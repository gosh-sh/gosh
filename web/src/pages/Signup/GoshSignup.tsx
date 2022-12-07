import { Field, Form, Formik } from 'formik'
import * as Yup from 'yup'
import { AppConfig, GoshError, useUser } from 'react-gosh'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import {
    githubRepositoriesSelectedSelector,
    githubSessionAtom,
    signupStepAtom,
} from '../../store/signup.state'
import { SwitchField, TextareaField, TextField } from '../../components/Formik'
import Spinner from '../../components/Spinner'
import { SignupProgress } from './SignupProgress'
import { supabase } from '../../helpers'
import { toast } from 'react-toastify'
import ToastError from '../../components/Error/ToastError'

type TGoshSignupProps = {
    signoutGithub(): Promise<void>
}

type TFormValues = {
    username: string
    email: string
    phrase: string
    isConfirmed: boolean
}

const GoshSignup = (props: TGoshSignupProps) => {
    const { signoutGithub } = props
    const githubSession = useRecoilValue(githubSessionAtom)
    const githubReposSelected = useRecoilValue(githubRepositoriesSelectedSelector)
    const setStep = useSetRecoilState(signupStepAtom)
    const { signup, signupProgress } = useUser()

    const getRandomPhrase = async () => {
        const { phrase } = await AppConfig.goshclient.crypto.mnemonic_from_random({})
        return phrase
    }

    const getOrCreateSupaUser = async (username: string, pubkey: string) => {
        const userExists = await supabase
            .from('users')
            .select()
            .eq('gosh_username', username)
        if (userExists.data?.length) {
            return userExists.data[0]
        }

        // Create user
        const { data, error } = await supabase
            .from('users')
            .insert({
                gosh_username: username,
                gosh_pubkey: `0x${pubkey}`,
            })
            .select()
        if (!data) {
            throw new GoshError(error.message || 'Error creating user')
        }
        return data[0]
    }

    const onFormSubmit = async (values: TFormValues) => {
        try {
            if (!githubSession.session) {
                throw new GoshError('Session undefined')
            }
            const { email, phrase } = values

            // Get keys from phrase
            const keypair = await AppConfig.goshclient.crypto.mnemonic_derive_sign_keys({
                phrase,
            })

            // Prepare GOSH username
            const username = (
                values.username.startsWith('@') ? values.username : `@${values.username}`
            ).trim()

            // Prepare emails
            const emails = new Set([
                githubSession.session?.user.user_metadata.email,
                email,
            ])

            // Deploy GOSH account
            await signup({ ...values, username })

            // Save auto clone repositories
            const supaUser = await getOrCreateSupaUser(username, keypair.public)
            const githubUser = githubSession.session.user
            console.debug('Supa user', supaUser)
            const { error } = await supabase.from('github').insert(
                githubReposSelected.map(([githubUrl, goshUrl]) => ({
                    user_id: supaUser.id,
                    github_user_id: githubUser.id,
                    email: Array.from(emails),
                    github_url: githubUrl,
                    gosh_url: goshUrl,
                })),
            )
            if (error) {
                throw new GoshError(error.message)
            }

            await signoutGithub()
            setStep({ index: 4 })
        } catch (e: any) {
            console.debug('E', e)
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    return (
        <div>
            <div>
                <button type="button" onClick={() => setStep({ index: 1 })}>
                    &laquo; Back
                </button>
            </div>

            <div className="px-9 sm:px-2 mt-2 mb-10 text-center text-gray-606060 text-lg sm:text-xl leading-normal">
                It's your seed phrase, please write it on paper
            </div>

            <Formik
                initialValues={{
                    username: githubSession.session?.user.user_metadata.user_name,
                    email: githubSession.session?.user.user_metadata.email,
                    phrase: '',
                    isConfirmed: false,
                }}
                onSubmit={onFormSubmit}
                validationSchema={Yup.object().shape({
                    username: Yup.string()
                        .matches(/^@?[\w-]+$/, 'Username has invalid characters')
                        .max(64, 'Max length is 64 characters')
                        .required('Username is required'),
                    email: Yup.string().email().required(),
                    phrase: Yup.string().required('Phrase is required'),
                    isConfirmed: Yup.boolean().oneOf([true], 'You should accept this'),
                })}
            >
                {({ isSubmitting, setFieldValue }) => (
                    <Form className="px-5 sm:px-124px">
                        <div className="mb-3">
                            <Field
                                name="username"
                                component={TextField}
                                inputProps={{
                                    autoComplete: 'off',
                                    placeholder: 'Username',
                                }}
                                help={
                                    <>
                                        <p>GOSH username</p>
                                        <p>
                                            Can be changed, if is already taken or you
                                            prefer another
                                        </p>
                                    </>
                                }
                            />
                        </div>

                        <div className="mb-3">
                            <Field
                                name="email"
                                component={TextField}
                                inputProps={{
                                    autoComplete: 'off',
                                    placeholder: 'Email',
                                }}
                                help={
                                    <>
                                        <p>Email to send notification to</p>
                                        <p>Can be changed, if you prefer another</p>
                                    </>
                                }
                            />
                        </div>

                        <div>
                            <Field
                                name="phrase"
                                component={TextareaField}
                                errorEnabled={false}
                                inputProps={{
                                    className: '!px-7 !py-6',
                                    autoComplete: 'off',
                                    placeholder:
                                        'Provide your seed phrase or generate random one',
                                }}
                                help={
                                    <>
                                        <p>GOSH cannot reset this phrase</p>
                                        <p>
                                            If you forget it, you might lose access to
                                            your account
                                        </p>
                                    </>
                                }
                            />
                            <div className="text-end">
                                <button
                                    className="btn btn--body py-1.5 px-2 text-xs leading-normal"
                                    onClick={async () => {
                                        const phrase = await getRandomPhrase()
                                        setFieldValue('phrase', phrase)
                                    }}
                                >
                                    Generate phrase
                                </button>
                            </div>
                        </div>

                        <div className="mt-72px">
                            <Field
                                name="isConfirmed"
                                component={SwitchField}
                                className="justify-center"
                                label="I have written phrase carefuly"
                                labelClassName="text-base text-gray-505050"
                                errorClassName="mt-2 text-center"
                            />
                        </div>

                        <div className="mt-6">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="btn btn--body w-full py-3 text-xl leading-normal"
                            >
                                {isSubmitting && <Spinner className="mr-3" size={'lg'} />}
                                Create account
                            </button>
                        </div>
                    </Form>
                )}
            </Formik>

            <SignupProgress progress={signupProgress} className="mt-4 mx-5 sm:mx-124px" />
        </div>
    )
}

export default GoshSignup
