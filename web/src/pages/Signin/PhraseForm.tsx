import { faTimes } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Combobox } from '@headlessui/react'
import { Form, Formik } from 'formik'
import { useEffect, useState } from 'react'
import { AppConfig } from 'react-gosh'
import Spinner from '../../components/Spinner'

type TSigninPhraseFormProps = {
    onSubmit(values: { words: string[] }): Promise<void>
}

const SigninPhraseForm = (props: TSigninPhraseFormProps) => {
    const { onSubmit } = props
    const [wordsList, setWordsList] = useState<string[]>([])
    const [wordsQuery, setWordsQuery] = useState('')

    const wordsSuggested = !wordsQuery
        ? wordsList.slice(0, 5)
        : wordsList
              .filter((word) => {
                  return word.toLowerCase().startsWith(wordsQuery.toLowerCase())
              })
              .slice(0, 5)

    const onPhrasePaste = (
        e: any,
        setFieldValue: (
            field: string,
            value: any,
            shouldValidate?: boolean | undefined,
        ) => void,
    ) => {
        const data = e.clipboardData.getData('text').split(' ')
        for (let i = 0; i < data.length; i++) {
            if (i > 12) {
                break
            }
            setFieldValue(`words.${i}`, data[i])
        }
    }

    useEffect(() => {
        const _getWords = async () => {
            const { words } = await AppConfig.goshclient.crypto.mnemonic_words({})
            setWordsList(words.split(' '))
        }

        _getWords()
    }, [])

    return (
        <div className="signin__phrase-form phrase-form">
            <div className="px-9 sm:px-2 mt-0 sm:mt-2 mb-10 text-center text-gray-606060 text-lg sm:text-xl leading-normal">
                Please, write your seed phrase
            </div>

            <Formik initialValues={{ words: new Array(12).fill('') }} onSubmit={onSubmit}>
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
                                        onPaste={(e: any) =>
                                            onPhrasePaste(e, setFieldValue)
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

                        <div className="phrase-form__submit">
                            <button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Spinner size={'lg'} />}
                                Sign in
                            </button>
                        </div>
                    </Form>
                )}
            </Formik>
        </div>
    )
}

export default SigninPhraseForm
