import { faExclamation, faTimes, faRotateRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Combobox } from '@headlessui/react'
import { Field, Form, Formik } from 'formik'
import { useCallback, useEffect, useState } from 'react'
import { AppConfig, classNames, EGoshError, GoshError, TDao } from 'react-gosh'
import { toast } from 'react-toastify'
import * as Yup from 'yup'
import { ToastError } from '../../../components/Toast'
import { Button } from '../../../components/Form'
import { SwitchField } from '../../../components/Formik'
import { Link, useLocation } from 'react-router-dom'

type TGoshPhraseProps = {
    dao: TDao
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
        React.SetStateAction<'username' | 'submit' | 'phrase' | undefined>
    >
}

const GoshPhrase = (props: TGoshPhraseProps) => {
    const { dao, signupState, setSignupState, setStep } = props
    const location = useLocation()
    const [wordsList, setWordsList] = useState<string[]>([])
    const [wordsQuery, setWordsQuery] = useState('')

    const wordsSuggested = !wordsQuery
        ? wordsList.slice(0, 5)
        : wordsList
              .filter((word) => {
                  return word.toLowerCase().startsWith(wordsQuery.toLowerCase())
              })
              .slice(0, 5)

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
            setStep('username')
        } catch (e: any) {
            console.error(e.message)
            toast.error(<ToastError error={e} />)
        }
    }

    useEffect(() => {
        const _getWords = async () => {
            const { words } = await AppConfig.goshclient.crypto.mnemonic_words({})
            setWordsList(words.split(' '))
        }

        _getWords()
    }, [])

    useEffect(() => {
        if (!signupState.phrase.length) {
            setRandomPhrase()
        }
    }, [signupState.phrase, setRandomPhrase])

    return (
        <>
            <div className="flex flex-wrap gap-6 items-center mb-8">
                <div>
                    <h3 className="text-xl font-medium">
                        Let's set up your GOSH account
                    </h3>
                    <div className="text-gray-53596d">
                        Write down the seed phrase in a safe place or enter an existing
                        one
                    </div>
                    {!dao.isAuthenticated && (
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
            </div>

            <div
                className={classNames(
                    'w-full lg:w-7/12 p-5',
                    'border border-gray-e6edff rounded-xl',
                )}
            >
                <Formik
                    initialValues={{
                        words: signupState.phrase,
                        isConfirmed: false,
                    }}
                    onSubmit={onFormSubmit}
                    validationSchema={Yup.object().shape({
                        isConfirmed: Yup.boolean().oneOf(
                            [true],
                            'You should accept this',
                        ),
                    })}
                    enableReinitialize
                >
                    {({ isSubmitting, setFieldValue, values }) => (
                        <Form>
                            <div className="phrase-form__words-btns">
                                <button
                                    type="button"
                                    onClick={() => {
                                        for (let i = 0; i < 12; i++) {
                                            setFieldValue(`words.${i}`, '')
                                        }
                                    }}
                                >
                                    <FontAwesomeIcon icon={faTimes} size="lg" />
                                    Clear
                                </button>
                                <button type="button" onClick={setRandomPhrase}>
                                    <FontAwesomeIcon icon={faRotateRight} />
                                    Generate
                                </button>
                            </div>

                            <div className="phrase-form__words">
                                {values.words.map((word, index) => (
                                    <Combobox
                                        key={index}
                                        as="div"
                                        value={word}
                                        nullable
                                        onChange={(value) => {
                                            setFieldValue(
                                                `words.${index}`,
                                                value ? value.toLowerCase() : '',
                                            )
                                        }}
                                        className="phrase-form__word"
                                    >
                                        <Combobox.Label className="phrase-form__word-label">
                                            Word #{index + 1}
                                        </Combobox.Label>
                                        <Combobox.Input
                                            displayValue={(v: string) => v}
                                            onChange={(event) =>
                                                setWordsQuery(event.target.value)
                                            }
                                            autoComplete="off"
                                            className="phrase-form__word-input"
                                        />
                                        <Combobox.Options className="phrase-form__word-suggestions">
                                            {wordsSuggested.map((word) => (
                                                <Combobox.Option
                                                    key={word}
                                                    value={word}
                                                    className="phrase-form__word-suggestion"
                                                >
                                                    {word}
                                                </Combobox.Option>
                                            ))}
                                        </Combobox.Options>
                                    </Combobox>
                                ))}
                            </div>

                            <div className="flex flex-nowrap mt-5 bg-red-ff3b30/5 px-3 py-2.5 rounded-xl text-red-ff3b30">
                                <div>
                                    <div className="border border-red-ff3b30 rounded-xl px-4 py-2">
                                        <FontAwesomeIcon icon={faExclamation} size="lg" />
                                    </div>
                                </div>
                                <span className="ml-3 text-xs">
                                    GOSH cannot reset this phrase! If you forget it, you
                                    might lose access to your account
                                </span>
                            </div>

                            <div className="phrase-form__confirm">
                                <Field
                                    name="isConfirmed"
                                    component={SwitchField}
                                    className="justify-center"
                                    label="I have written phrase carefuly"
                                    labelClassName="text-sm text-gray-505050"
                                    errorClassName="mt-2 text-center text-sm"
                                />
                            </div>

                            <div className="mt-5">
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={isSubmitting}
                                    isLoading={isSubmitting}
                                >
                                    Continue
                                </Button>
                            </div>
                        </Form>
                    )}
                </Formik>
            </div>
        </>
    )
}

export default GoshPhrase
