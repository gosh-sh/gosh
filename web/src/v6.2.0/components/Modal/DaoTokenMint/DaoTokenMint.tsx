import { Dialog } from '@headlessui/react'
import { Field, Form, Formik } from 'formik'
import randomColor from 'randomcolor'
import { useNavigate } from 'react-router-dom'
import Select from 'react-select'
import { useSetRecoilState } from 'recoil'
import { Button } from '../../../../components/Form'
import { BaseField, FormikInput, FormikTextarea } from '../../../../components/Formik'
import { ModalCloseButton } from '../../../../components/Modal'
import { Select2ClassNames } from '../../../../helpers'
import { appModalStateAtom } from '../../../../store/app.state'
import { useDao, useMintDaoTokens } from '../../../hooks/dao.hooks'
import yup from '../../../yup-extended'

type TFormValues = {
    amount: string
    comment: string
    expert_tags: string[]
}

const DaoTokenMintModal = () => {
    const navigate = useNavigate()
    const setModal = useSetRecoilState(appModalStateAtom)
    const dao = useDao()
    const { mint } = useMintDaoTokens()

    const onModalReset = () => {
        setModal((state) => ({ ...state, isOpen: false }))
    }

    const onSubmit = async (values: TFormValues) => {
        try {
            const { comment } = values
            const { eventaddr } = await mint({
                amount: parseInt(values.amount),
                comment,
                expert_tags: values.expert_tags,
            })
            onModalReset()
            if (eventaddr) {
                navigate(`/o/${dao.details.name}/events/${eventaddr}`)
            }
        } catch (e: any) {
            console.error(e.message)
        }
    }

    return (
        <Dialog.Panel className="relative rounded-xl bg-white p-10 w-full max-w-md">
            <Formik
                initialValues={{
                    amount: '',
                    comment: '',
                    expert_tags: [],
                }}
                validationSchema={yup.object().shape({
                    amount: yup.number().integer().positive().required(),
                    comment: yup.string().required(),
                })}
                onSubmit={onSubmit}
            >
                {({ isSubmitting, setFieldValue }) => (
                    <Form>
                        <ModalCloseButton disabled={isSubmitting} />
                        <Dialog.Title className="mb-8 text-3xl text-center font-medium">
                            Mint tokens
                        </Dialog.Title>

                        <div className="mt-6">
                            <Field
                                name="amount"
                                component={FormikInput}
                                autoComplete="off"
                                placeholder="Amount of tokens to mint"
                                disabled={isSubmitting}
                            />
                        </div>
                        <hr className="mt-8 mb-6 bg-gray-e6edff" />
                        <div>
                            <Field
                                name="comment"
                                component={FormikTextarea}
                                disabled={isSubmitting}
                                placeholder="Write a description so that the DAO members can understand it"
                            />
                        </div>
                        <div className="mt-6">
                            <Field name="expert_tags" component={BaseField}>
                                <Select
                                    options={dao.details.expert_tags?.map((item) => ({
                                        label: item.name,
                                        value: item.name,
                                    }))}
                                    isMulti
                                    isClearable
                                    isDisabled={isSubmitting}
                                    placeholder="Karma tags"
                                    classNames={{
                                        ...Select2ClassNames,
                                        multiValueRemove: () => '!p-0.5',
                                    }}
                                    styles={{
                                        multiValue: (base, props) => ({
                                            ...base,
                                            display: 'flex',
                                            alignItems: 'center',
                                            flexWrap: 'nowrap',
                                            fontSize: '0.875rem !important',
                                            padding: '0 0.5rem',
                                            borderRadius: '2.25rem',
                                            margin: '0 0.125rem',
                                            color: randomColor({
                                                seed: props.data.label,
                                                luminosity: 'dark',
                                            }),
                                            backgroundColor: randomColor({
                                                seed: props.data.label,
                                                luminosity: 'light',
                                                format: 'rgba',
                                                alpha: 0.35,
                                            }),
                                        }),
                                        multiValueLabel: (base, props) => ({
                                            ...base,
                                            color: randomColor({
                                                seed: props.data.label,
                                                luminosity: 'dark',
                                            }),
                                        }),
                                    }}
                                    onChange={(option) => {
                                        setFieldValue(
                                            'expert_tags',
                                            option.map(({ value }) => value),
                                        )
                                    }}
                                />
                            </Field>
                        </div>
                        <div className="mt-4">
                            <Button
                                type="submit"
                                className="w-full"
                                isLoading={isSubmitting}
                                disabled={isSubmitting}
                            >
                                Mint tokens
                            </Button>
                        </div>
                    </Form>
                )}
            </Formik>
        </Dialog.Panel>
    )
}

export { DaoTokenMintModal }
