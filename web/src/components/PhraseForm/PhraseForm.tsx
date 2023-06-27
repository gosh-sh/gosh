import { PropsWithChildren, useEffect, useState } from 'react'
import { getClipboardData } from '../../helpers'
import { toast } from 'react-toastify'
import { ToastError } from '../Toast'
import { AppConfig } from '../../appconfig'
import { Form, Formik, FormikHelpers } from 'formik'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaste, faTrashAlt } from '@fortawesome/free-regular-svg-icons'
import { Combobox } from '@headlessui/react'
import { Button, Input, TButtonProps } from '../Form'
import { faRotateRight } from '@fortawesome/free-solid-svg-icons'
import classNames from 'classnames'

type TPhraseFormProps = PropsWithChildren & {
    initialValues?: object
    validationSchema?: any
    btnGenerate?: boolean
    btnPaste?: boolean
    btnClear?: boolean
    btnSubmitProps?: TButtonProps
    btnSubmitContent?: any
    onSubmit(values: object): Promise<void>
    onGenerate?(words: string[]): Promise<void>
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
        onGenerate,
    } = props
    const [wordsList, setWordsList] = useState<string[]>([])
    const [wordsQuery, setWordsQuery] = useState('')

    const wordsSuggested = !wordsQuery
        ? wordsList.slice(0, 5)
        : wordsList
              .filter((word) => {
                  return word.toLowerCase().startsWith(wordsQuery.toLowerCase())
              })
              .slice(0, 5)

    const onPhraseGenerate = async (
        setFieldValue: FormikHelpers<any>['setFieldValue'],
    ) => {
        const { phrase } = await AppConfig.goshclient.crypto.mnemonic_from_random({})
        const words = phrase.split(' ')
        for (let i = 0; i < words.length; i++) {
            if (i > 11) {
                break
            }
            setFieldValue(`words.${i}`, { value: words[i], index: i })
        }

        onGenerate && (await onGenerate(words))
    }

    const onPhrasePaste = async (
        setFieldValue: FormikHelpers<any>['setFieldValue'],
        e?: any,
    ) => {
        const data = await getClipboardData(e)
        if (data !== null) {
            const words = data.split(' ')
            for (let i = 0; i < words.length; i++) {
                if (i > 11) {
                    break
                }
                setFieldValue(`words.${i}`, { value: words[i], index: i })
            }
        } else {
            const error = {
                title: 'Clipboard unavailable',
                message: 'Try to use keyboard shortcut to paste data from clipboard',
            }
            toast.error(<ToastError error={error} />)
        }
    }

    const onPhraseClear = (setFieldValue: FormikHelpers<any>['setFieldValue']) => {
        for (let i = 0; i < 12; i++) {
            setFieldValue(`words.${i}`, { value: '', index: i })
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
        <Formik
            initialValues={{
                words: Array.from(new Array(12)).map((_, index) => ({
                    value: '',
                    index,
                })),
                ...initialValues,
            }}
            validationSchema={validationSchema}
            onSubmit={onSubmit}
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

                    <div className="relative grid grid-cols-1 md:grid-cols-3 gap-3">
                        {values.words.map((word, index) => (
                            <Combobox
                                key={index}
                                as="div"
                                value={word.value}
                                nullable
                                onChange={(value) => {
                                    setFieldValue(
                                        `words.${index}`,
                                        value
                                            ? {
                                                  value: value.toLowerCase(),
                                                  index: word.index,
                                              }
                                            : { value: '', index: word.index },
                                    )
                                }}
                            >
                                <Combobox.Label className="text-xs text-gray-7c8db5">
                                    Word #{word.index + 1}
                                </Combobox.Label>
                                <Combobox.Input
                                    as={Input}
                                    displayValue={(v: string) => v}
                                    onChange={(event) =>
                                        setWordsQuery(event.target.value)
                                    }
                                    onPaste={(e: any) => {
                                        onPhrasePaste(setFieldValue, e)
                                    }}
                                    autoComplete="off"
                                />
                                <Combobox.Options className="absolute bg-white border border-gray-e6edff rounded-lg">
                                    {wordsSuggested.map((word) => (
                                        <Combobox.Option
                                            key={word}
                                            value={word}
                                            className="py-2 px-4 hover:bg-gray-fafafd cursor-pointer"
                                        >
                                            {word}
                                        </Combobox.Option>
                                    ))}
                                </Combobox.Options>
                            </Combobox>
                        ))}
                    </div>

                    {children}

                    <div className="mt-8 text-center">
                        <Button
                            type="submit"
                            size="lg"
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
