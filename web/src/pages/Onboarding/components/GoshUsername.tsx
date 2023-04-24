import { Field, Form, Formik } from 'formik'
import { AppConfig, GoshError, useUser } from 'react-gosh'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import yup from '../../../yup-extended'
import { validateOnboardingDao, validateOnboardingRepo } from '../helpers'
import { supabase } from '../../../helpers'
import PinCodeModal from '../../../components/Modal/PinCode'
import { SignupProgress } from '../../Signup/components/SignupProgress'
import { appModalStateAtom } from '../../../store/app.state'
import {
    daoInvitesSelector,
    OAuthSessionAtom,
    onboardingDataAtom,
    repositoriesCheckedSelector,
} from '../../../store/onboarding.state'
import { toast } from 'react-toastify'
import { ToastError } from '../../../components/Toast'
import { EDaoInviteStatus } from '../../../store/onboarding.types'
import PreviousStep from './PreviousStep'
import { FormikInput } from '../../../components/Formik'
import { Button } from '../../../components/Form'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExclamation } from '@fortawesome/free-solid-svg-icons'

type TGoshUsernameProps = {
    signoutOAuth(): Promise<void>
}

const GoshUsername = (props: TGoshUsernameProps) => {
    const { signoutOAuth } = props
    const { session } = useRecoilValue(OAuthSessionAtom)
    const [{ phrase, emailOther, isEmailPublic }, setOnboarding] =
        useRecoilState(onboardingDataAtom)
    const repositories = useRecoilValue(repositoriesCheckedSelector)
    const { items: invites } = useRecoilValue(daoInvitesSelector)
    const setModal = useSetRecoilState(appModalStateAtom)
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

    const createDbUser = async (
        username: string,
        pubkey: string,
        authUserId: string,
        email: string | null,
        emailOther: string | null,
    ) => {
        const { data, error } = await supabase
            .from('users')
            .insert({
                gosh_username: username,
                gosh_pubkey: `0x${pubkey}`,
                auth_user: authUserId,
                email,
                email_other: emailOther,
            })
            .select()
            .single()
        if (error) {
            throw new GoshError(error.message)
        }
        return data
    }

    const createDbGithubRecord = async (item: {
        user_id: string
        github_url: string
        gosh_url: string
    }) => {
        const { user_id, github_url, gosh_url } = item
        const { count, error } = await supabase
            .from('github')
            .select('*', { count: 'exact' })
            .eq('user_id', user_id)
            .eq('github_url', github_url)
            .eq('gosh_url', gosh_url)
        if (error) {
            throw new Error(error.message)
        }

        if (!count) {
            const { error } = await supabase.from('github').insert(item)
            if (error) {
                throw new Error(error.message)
            }
        }
    }

    const onBackClick = () => {
        setOnboarding((state) => ({ ...state, step: 'phrase' }))
    }

    const onFormSubmit = async (values: { username: string }) => {
        try {
            if (!session) {
                throw new GoshError('Session undefined')
            }

            // Prepare data
            const username = values.username.trim().toLowerCase()
            const seed = phrase.join(' ')
            const keypair = await AppConfig.goshclient.crypto.mnemonic_derive_sign_keys({
                phrase: seed,
            })

            // Get or create DB user
            let dbUser = await getDbUser(username)
            if (!dbUser) {
                dbUser = await createDbUser(
                    username,
                    keypair.public,
                    session.user.id,
                    isEmailPublic ? session.user.email || null : null,
                    emailOther || null,
                )
            }

            // Save auto clone repositories
            const goshAddress = Object.values(AppConfig.versions).reverse()[0]
            const goshProtocol = `gosh://${goshAddress}`
            for (const item of repositories) {
                const { daoName, name } = item
                await createDbGithubRecord({
                    user_id: dbUser.id,
                    github_url: `/${daoName}/${name}`,
                    gosh_url: `${goshProtocol}/${daoName.toLowerCase()}/${name.toLowerCase()}`,
                })
            }

            // Update DAO invites status
            for (const invite of invites) {
                const { error } = await supabase
                    .from('dao_invite')
                    .update({
                        recipient_username: username,
                        recipient_status: invite.accepted
                            ? EDaoInviteStatus.ACCEPTED
                            : EDaoInviteStatus.REJECTED,
                        token_expired: true,
                    })
                    .eq('id', invite.id)
                if (error) {
                    throw new GoshError(error.message)
                }
            }

            // Deploy GOSH account
            await signup({ phrase: seed, username })

            // Validate onboarding data
            const validationResult = await Promise.all(
                repositories.map(async (item) => {
                    const daoName = item.daoName.toLowerCase()
                    const repoName = item.name.toLowerCase()

                    const daoValidation = await validateOnboardingDao(daoName)
                    if (!daoValidation.valid) {
                        return false
                    }

                    const repoValidation = await validateOnboardingRepo(daoName, repoName)
                    if (!repoValidation.valid) {
                        return false
                    }

                    return true
                }),
            )
            const isAllValid = validationResult.every((r) => !!r)

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
                            setOnboarding((state) => ({
                                ...state,
                                step: 'complete',
                                username,
                                email: session.user.email!,
                                redirectTo: isAllValid ? '/a/orgs' : '/onboarding/status',
                            }))
                        }}
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
                    <PreviousStep onClick={onBackClick} />
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
                            username: (
                                session?.user.user_metadata.user_name || ''
                            ).toLowerCase(),
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
                                        component={FormikInput}
                                        autoComplete="off"
                                        placeholder="Username"
                                        onChange={(e: any) =>
                                            setFieldValue(
                                                'username',
                                                e.target.value.toLowerCase(),
                                            )
                                        }
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

                                <div className="flex flex-nowrap mt-5 bg-red-ff3b30/5 px-3 py-2.5 rounded-xl text-red-ff3b30">
                                    <div>
                                        <div className="border border-red-ff3b30 rounded-xl px-4 py-2">
                                            <FontAwesomeIcon
                                                icon={faExclamation}
                                                size="lg"
                                            />
                                        </div>
                                    </div>
                                    <span className="ml-3 text-xs">
                                        This is your unique cryptographic identifier in
                                        Gosh. <br />
                                        Please note that after creating your username it
                                        will be impossible to change it in the future
                                    </span>
                                </div>

                                <div className="nickname-form__submit">
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                        isLoading={isSubmitting}
                                    >
                                        Create account
                                    </Button>
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

export default GoshUsername
