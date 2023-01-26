import { faExclamation, faTimes, faRotateRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Combobox } from '@headlessui/react'
import { Field, Form, Formik } from 'formik'
import { useCallback, useEffect, useState } from 'react'
import { AppConfig, EGoshError, GoshError } from 'react-gosh'
import { toast } from 'react-toastify'
import { useRecoilState } from 'recoil'
import * as Yup from 'yup'
import ToastError from '../../../components/Error/ToastError'
import { SwitchField } from '../../../components/Formik'
import Spinner from '../../../components/Spinner'
import { onboardingDataAtom } from '../../../store/onboarding.state'
import PreviousStep from './PreviousStep'

const GoshPhrase = () => {
    const [{ phrase }, setOnboarding] = useRecoilState(onboardingDataAtom)
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
        const { phrase } = await AppConfig.goshclient.crypto.mnemonic_from_random({})
        setOnboarding((state) => ({ ...state, phrase: phrase.split(' ') }))
    }, [setOnboarding])

    const onBackClick = () => {
        setOnboarding((state) => ({ ...state, step: 'organizations' }))
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
            setOnboarding((state) => ({ ...state, step: 'username' }))
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
        if (!phrase.length) {
            setRandomPhrase()
        }
    }, [phrase, setRandomPhrase])

    return (
        <div className="signup signup--phrase">
            <div className="signup__aside signup__aside--step aside-step">
                <div className="aside-step__header">
                    <PreviousStep onClick={onBackClick} />
                </div>

                <p className="aside-step__text">Let's set up your GOSH account</p>

                <p className="aside-step__text-secondary">
                    Write down the seed phrase in a safe place or enter an existing one if
                    you already have a GOSH account
                </p>
            </div>

            <div className="signup__content">
                <div className="signup__phrase-form phrase-form">
                    <Formik
                        initialValues={{
                            words: phrase,
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
                                            <FontAwesomeIcon
                                                icon={faExclamation}
                                                size="lg"
                                            />
                                        </div>
                                    </div>
                                    <span className="ml-3 text-xs">
                                        GOSH cannot reset this phrase! If you forget it,
                                        you might lose access to your account
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

                                <div className="phrase-form__submit phrase-form__submit--full">
                                    <button type="submit" disabled={isSubmitting}>
                                        {isSubmitting && <Spinner size={'lg'} />}
                                        Continue
                                    </button>
                                </div>
                            </Form>
                        )}
                    </Formik>
                </div>
            </div>
        </div>
    )
}

export default GoshPhrase
