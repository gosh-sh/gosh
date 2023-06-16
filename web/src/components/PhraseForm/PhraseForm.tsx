import { PropsWithChildren, useEffect, useRef, useState } from 'react'
import { getClipboardData } from '../../helpers'
import { toast } from 'react-toastify'
import { ToastError } from '../Toast'

import { Form, Formik, FormikHelpers } from 'formik'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaste, faTrashAlt } from '@fortawesome/free-regular-svg-icons'
import { Button, TButtonProps, Textarea } from '../Form'
import { faRotateRight } from '@fortawesome/free-solid-svg-icons'
import classNames from 'classnames'
import { AppConfig } from 'react-gosh'

type TPhraseFormProps = PropsWithChildren & {
    initialValues?: any
    validationSchema?: any
    btnGenerate?: boolean
    btnPaste?: boolean
    btnClear?: boolean
    btnSubmitProps?: TButtonProps
    btnSubmitContent?: any
    wordCount?: number
    onSubmit(values: any): Promise<void>
    onGenerate?(words: string[]): Promise<void>
}

const EM_QUAD = ' '
const EM_2DASH = '⸺'
const SPLITTER = `${EM_QUAD}${EM_2DASH}${EM_QUAD}`

const getChangedWord = (current: string, previous: string): [string, number] => {
    const currentWords = current.split(SPLITTER)
    const lastWords = previous.split(SPLITTER)

    for (let i = Math.max(currentWords.length, lastWords.length) - 1; i >= 0; i -= 1) {
        if (
            lastWords[i] != undefined &&
            currentWords[i] != undefined &&
            lastWords[i] !== currentWords[i]
        ) {
            return [currentWords[i], i]
        }
    }

    return ['', -1]
}

const PhraseForm = (props: TPhraseFormProps) => {
    const {
        initialValues,
        validationSchema,
        onSubmit,
        children,
        btnGenerate,
        btnPaste,
        btnClear,
        btnSubmitProps,
        btnSubmitContent = 'Submit',
        wordCount = 12,
        onGenerate,
    } = props
    const [wordsList, setWordsList] = useState<string[]>([])
    const [wordsQuery, setWordsQuery] = useState('')
    const [wordsChangedIndex, setWordsChangedIndex] = useState(0)
    const [wordsSuggestedActive, setWordsSuggestedActive] = useState<number>(0)
    const wordsRef = useRef<HTMLTextAreaElement>(null)

    const wordsSuggested = !wordsQuery
        ? []
        : wordsList
              .filter((word) => {
                  return word.toLowerCase().startsWith(wordsQuery.toLowerCase())
              })
              .slice(0, 5)

    const onPhraseGenerate = async (
        setFieldValue: FormikHelpers<any>['setFieldValue'],
    ) => {
        const { phrase } = await AppConfig.goshclient.crypto.mnemonic_from_random({
            word_count: wordCount,
        })
        const words = phrase.split(' ')
        setFieldValue('words', words.join(SPLITTER))
        setWordsQuery('')
        onGenerate && (await onGenerate(words))
    }

    const onPhrasePaste = async (
        setFieldValue: FormikHelpers<any>['setFieldValue'],
        e?: any,
    ) => {
        e.preventDefault()

        const data = await getClipboardData(e)
        if (data !== null) {
            const words = data.split(' ')
            setFieldValue('words', words.join(SPLITTER))
        } else {
            const error = {
                title: 'Clipboard unavailable',
                message: 'Try to use keyboard shortcut to paste data from clipboard',
            }
            toast.error(<ToastError error={error} />)
        }
    }

    const onPhraseClear = (setFieldValue: FormikHelpers<any>['setFieldValue']) => {
        setFieldValue('words', '')
        setWordsQuery('')
    }

    const onPhraseKeyUpDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (wordsSuggested.length) {
            e.preventDefault()
        }

        const direction = e.key === 'ArrowDown' ? 1 : -1
        setWordsSuggestedActive((state) => {
            const updated = state + direction
            const max = wordsSuggested.length - 1
            if (updated < 0) {
                return max
            } else if (updated > max) {
                return 0
            } else {
                return updated
            }
        })
    }

    const onSuggestedWordSelect = (
        word: string,
        words: string,
        e: React.SyntheticEvent<any>,
        setFieldValue: FormikHelpers<any>['setFieldValue'],
    ) => {
        if (wordsChangedIndex < 0) {
            return words
        }

        e.preventDefault()
        const wordList = words.split(SPLITTER)

        if (wordsChangedIndex === wordList.length - 1 && wordsChangedIndex !== 11) {
            word += SPLITTER
        }

        const updated = [
            ...wordList.slice(0, wordsChangedIndex),
            word,
            ...wordList.slice(wordsChangedIndex + 1),
        ]
        setWordsQuery('')
        setFieldValue('words', updated.join(SPLITTER))
        wordsRef.current?.focus()
    }

    const onFormSubmit = async (values: any) => {
        await onSubmit({ ...values, words: values.words.split(SPLITTER) })
    }

    useEffect(() => {
        const _getWords = async () => {
            const { words } = await AppConfig.goshclient.crypto.mnemonic_words({})
            setWordsList(words.split(' '))
        }

        _getWords()
    }, [])

    return (
        <Formik
            initialValues={{
                ...initialValues,
                words: initialValues?.words.join(SPLITTER) || '',
            }}
            validationSchema={validationSchema}
            onSubmit={onFormSubmit}
            enableReinitialize
        >
            {({ isSubmitting, setFieldValue, values }) => (
                <Form>
                    <div
                        className={classNames(
                            'text-right',
                            btnGenerate || btnPaste || btnClear ? 'mb-3' : null,
                        )}
                    >
                        {btnGenerate && (
                            <Button
                                type="button"
                                variant="custom"
                                className="text-gray-7c8db5 hover:text-gray-53596d"
                                onClick={() => onPhraseGenerate(setFieldValue)}
                            >
                                <FontAwesomeIcon icon={faRotateRight} className="mr-2" />
                                Generate
                            </Button>
                        )}
                        {btnPaste && (
                            <Button
                                type="button"
                                variant="custom"
                                className="text-gray-7c8db5 hover:text-gray-53596d"
                                onClick={(e) => onPhrasePaste(setFieldValue, e)}
                            >
                                <FontAwesomeIcon icon={faPaste} className="mr-2" />
                                Paste
                            </Button>
                        )}
                        {btnClear && (
                            <Button
                                type="button"
                                variant="custom"
                                className="text-gray-7c8db5 hover:text-gray-53596d"
                                onClick={() => onPhraseClear(setFieldValue)}
                            >
                                <FontAwesomeIcon icon={faTrashAlt} className="mr-2" />
                                Clear
                            </Button>
                        )}
                    </div>

                    <div className="relative z-10">
                        <Textarea
                            ref={wordsRef}
                            name="words"
                            value={values.words}
                            minRows={2}
                            className="z-10"
                            inputClassName="!leading-6 !p-6"
                            placeholder="Input your seed phrase"
                            onPaste={(e) => {
                                onPhrasePaste(setFieldValue, e)
                            }}
                            onKeyDown={(e) => {
                                if (['ArrowDown', 'ArrowUp'].indexOf(e.key) >= 0) {
                                    onPhraseKeyUpDown(e)
                                } else if (e.key === 'Enter') {
                                    onSuggestedWordSelect(
                                        wordsSuggested[wordsSuggestedActive],
                                        e.currentTarget.value,
                                        e,
                                        setFieldValue,
                                    )
                                }
                            }}
                            onChange={(e) => {
                                const value = e.target.value
                                const caretPos = e.target.selectionEnd
                                const caretVal = value[caretPos - 1] ?? ''
                                console.debug('pos:', caretPos, 'val:', `|${caretVal}|`)

                                if (value.indexOf('\n') >= 0) {
                                    return
                                }

                                const [changedWord, changedIndex] = getChangedWord(
                                    e.target.value,
                                    values.words,
                                )
                                setWordsQuery(changedWord)
                                setWordsChangedIndex(changedIndex)
                                setWordsSuggestedActive(0)

                                if (caretVal === ' ') {
                                    const next = value.slice(caretPos, caretPos + 2)
                                    if (next.indexOf(EM_2DASH) >= 0) {
                                        if (next[0] === EM_QUAD) {
                                            setTimeout(() => {
                                                e.target.selectionEnd = caretPos + 2
                                            }, 5)
                                        } else if (next[0] === EM_2DASH) {
                                            setTimeout(() => {
                                                e.target.selectionEnd = caretPos + 1
                                            }, 5)
                                        }
                                    } else if (
                                        values.words.split(SPLITTER).length < wordCount
                                    ) {
                                        setFieldValue(
                                            'words',
                                            `${values.words}${SPLITTER}`,
                                        )
                                    }
                                } else if (caretVal === EM_2DASH) {
                                    const before = values.words.slice(0, caretPos - 2)
                                    const after = values.words.slice(caretPos + 1)
                                    setFieldValue('words', `${before}${after}`)
                                } else {
                                    setFieldValue('words', value)
                                }
                            }}
                        />

                        <div
                            className={classNames(
                                'absolute top-full -translate-y-px left-2 bg-white',
                                'border border-gray-e5e5f9 rounded-b-lg overflow-hidden',
                                !wordsSuggested.length ? 'hidden' : null,
                            )}
                        >
                            {wordsSuggested.map((word, i) => (
                                <Button
                                    key={i}
                                    variant="custom"
                                    type="button"
                                    className={classNames(
                                        'hover:bg-gray-fafafd !rounded-none w-full !text-left',
                                        wordsSuggestedActive === i
                                            ? 'bg-gray-fafafd'
                                            : null,
                                    )}
                                    onClick={(e) => {
                                        setWordsSuggestedActive(i)
                                        onSuggestedWordSelect(
                                            word,
                                            values.words,
                                            e,
                                            setFieldValue,
                                        )
                                    }}
                                >
                                    {word}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {children}

                    <div className="mt-8 text-center">
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            isLoading={isSubmitting}
                            {...btnSubmitProps}
                        >
                            {btnSubmitContent}
                        </Button>
                    </div>
                </Form>
            )}
        </Formik>
    )
}

export default PhraseForm
