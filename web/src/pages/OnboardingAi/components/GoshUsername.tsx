import { Field, Form, Formik } from 'formik'
import { GoshAdapterFactory, GoshError, useDaoCreate, useUser } from 'react-gosh'
import { useSetRecoilState } from 'recoil'
import yup from '../../../yup-extended'
import { PinCodeModal } from '../../../components/Modal'
import { SignupProgress } from '../../Signup/components/SignupProgress'
import { appModalStateAtom } from '../../../store/app.state'
import { toast } from 'react-toastify'
import { ToastError } from '../../../components/Toast'
import PreviousStep from './PreviousStep'
import { FormikInput } from '../../../components/Formik'
import { Button } from '../../../components/Form'
import Alert from '../../../components/Alert'
import DaoCreateProgress from '../../DaoCreate/2.0.0/DaoCreateProgress'
import { useNavigate } from 'react-router-dom'

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
    setStep: React.Dispatch<React.SetStateAction<'phrase' | 'phrase-check' | 'username'>>
}

const GoshUsername = (props: TGoshUsernameProps) => {
    const { signupState, setSignupState, setStep } = props
    const setModal = useSetRecoilState(appModalStateAtom)
    const { signup, signupProgress } = useUser()
    const { create: createDao, progress: createDaoProgress } = useDaoCreate()
    const navigate = useNavigate()

    const onBackClick = () => {
        setStep('phrase')
    }

    const onFormSubmit = async (values: { username: string }) => {
        try {
            // Prepare data
            const username = values.username.trim().toLowerCase()
            const seed = signupState.phrase.join(' ')
            const daoname = `${username}-ai`
            const gosh = GoshAdapterFactory.createLatest()

            // Check if DAO exists
            const _dao = await gosh.getDao({ name: daoname, useAuth: false })
            if (await _dao.isDeployed()) {
                throw new GoshError('DAO create error', 'DAO already exists')
            }

            // Deploy GOSH account
            const auth = await signup({ phrase: seed, username })
            setSignupState((state) => ({ ...state, username }))

            // Create DAO
            const dao = await createDao(daoname, { tags: ['GoshAI'], auth })
            const aiUsername = import.meta.env.REACT_APP_GOSHAI_NAME
            // TODO: Add gosh-ai bot as dao member
            // await dao.createMember({
            //     alone: true,
            //     members: [
            //         {
            //             user: { name: aiUsername, type: 'user' },
            //             allowance: 0,
            //             comment: '',
            //             expired: 0,
            //         },
            //     ],
            // })

            // Create PIN-code
            setModal({
                static: true,
                isOpen: true,
                element: <PinCodeModal phrase={seed} onUnlock={() => navigate('/ai')} />,
            })
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    return (
        <>
            <div className="flex flex-wrap gap-4 items-center justify-around">
                <div className="basis-4/12">
                    <div className="mb-6">
                        <PreviousStep onClick={onBackClick} />
                    </div>
                    <h3 className="text-3xl font-medium">Choose a short nickname</h3>
                    <div className="mt-2 text-gray-53596d text-sm">
                        It will be visible to all gosh users
                    </div>
                </div>
                <div className="basis-4/12">
                    <div className="p-8 border border-gray-e6edff rounded-xl">
                        <Formik
                            initialValues={{ username: '' }}
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
                                            label="Your GOSH nickname"
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
                                            disabled={isSubmitting}
                                        />
                                    </div>

                                    <Alert variant="danger" className="text-xs">
                                        This is your unique cryptographic identifier in
                                        Gosh.
                                        <br />
                                        Please note that after creating your username it
                                        will be impossible to change it in the future
                                    </Alert>

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

                        <SignupProgress progress={signupProgress} className="mt-4" />
                        <DaoCreateProgress
                            progress={createDaoProgress}
                            className="mt-4"
                        />
                    </div>
                </div>
            </div>
        </>
    )
}

export default GoshUsername
