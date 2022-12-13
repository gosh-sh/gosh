import { Field, Form, Formik } from 'formik'
import * as Yup from 'yup'
import { AppConfig, classNames, GoshError, useUser } from 'react-gosh'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import {
    githubRepositoriesSelectedSelector,
    githubSessionAtom,
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

type TGoshSignupUsernameProps = {
    phrase: string
    signoutGithub(): Promise<void>
}

const GoshSignupUsername = (props: TGoshSignupUsernameProps) => {
    const { phrase, signoutGithub } = props
    const githubSession = useRecoilValue(githubSessionAtom)
    const githubReposSelected = useRecoilValue(githubRepositoriesSelectedSelector)
    const setStep = useSetRecoilState(signupStepAtom)
    const { signup, signupProgress } = useUser()

    const getOrCreateSupaUser = async (
        username: string,
        pubkey: string,
        authUserId: string,
    ) => {
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
                auth_user: authUserId,
            })
            .select()
        if (!data) {
            throw new GoshError(error.message || 'Error creating user')
        }
        return data[0]
    }

    const onFormSubmit = async (values: { username: string }) => {
        try {
            if (!githubSession.session) {
                throw new GoshError('Session undefined')
            }

            // Prepare data
            const githubUser = githubSession.session.user
            const username = values.username.trim()
            const keypair = await AppConfig.goshclient.crypto.mnemonic_derive_sign_keys({
                phrase,
            })

            // Deploy GOSH account
            await signup({ phrase, username })

            // Save auto clone repositories
            const goshUser = await getOrCreateSupaUser(
                username,
                keypair.public,
                githubUser.id,
            )
            const { error: error } = await supabase.from('github').insert(
                githubReposSelected.map(([githubUrl, goshUrl]) => ({
                    user_id: goshUser.id,
                    github_url: githubUrl,
                    gosh_url: goshUrl,
                })),
            )
            if (error) {
                throw new GoshError(error.message)
            }

            await signoutGithub()
            setStep({ index: 5, data: { username, email: githubUser.email } })
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    return (
        <div className="flex justify-between items-start pt-36 pb-5">
            <div className="basis-1/2 px-24">
                <div className="mt-28">
                    <button
                        type="button"
                        className={classNames(
                            'rounded-full border w-10 h-10 mr-6 text-gray-200',
                            'hover:text-gray-400 hover:bg-gray-50',
                        )}
                        onClick={() => setStep({ index: 3 })}
                    >
                        <FontAwesomeIcon icon={faArrowLeft} />
                    </button>
                    <span className="text-xl font-medium">Back</span>
                </div>

                <p className="mt-8 mb-4 text-2xl leading-normal font-medium">
                    Choose a short nickname
                </p>

                <p className="text-gray-53596d">or create a new one</p>
            </div>

            <div className="basis-1/2 border rounded-xl p-10">
                <p className="text-2xl text-center text-blue-348eff font-medium mb-1">
                    {githubSession.session?.user.user_metadata.user_name}
                </p>
                <p className="text-gray-53596d text-center mb-8">your GOSH nickname</p>

                <Formik
                    initialValues={{
                        username: githubSession.session?.user.user_metadata.user_name,
                        isConfirmed: false,
                    }}
                    onSubmit={onFormSubmit}
                    validationSchema={Yup.object().shape({
                        username: Yup.string()
                            .matches(/^[\w-]+$/, 'Username has invalid characters')
                            .max(64, 'Max length is 64 characters')
                            .required('Username is required'),
                    })}
                >
                    {({ isSubmitting, setFieldValue }) => (
                        <Form className="px-12">
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
                                                Can be changed, if is already taken or you
                                                prefer another
                                            </p>
                                        </>
                                    }
                                />
                            </div>

                            <div className="mt-10">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="btn btn--body w-full py-3 leading-normal font-medium"
                                >
                                    {isSubmitting && (
                                        <Spinner className="mr-3" size={'lg'} />
                                    )}
                                    Create account
                                </button>
                            </div>
                        </Form>
                    )}
                </Formik>

                <SignupProgress progress={signupProgress} className="mt-4" />
            </div>
        </div>
    )
}

export default GoshSignupUsername
