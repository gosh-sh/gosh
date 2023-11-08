import { faPlus, faTimes } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Dialog } from '@headlessui/react'
import classNames from 'classnames'
import {
    ErrorMessage,
    Field,
    FieldArray,
    FieldArrayRenderProps,
    Form,
    Formik,
    FormikHelpers,
} from 'formik'
import { AnimatePresence, motion } from 'framer-motion'
import _ from 'lodash'
import { Button } from '../../../components/Form'
import { FormikInput } from '../../../components/Formik'
import { ModalCloseButton } from '../../../components/Modal'
import { useDao } from '../../hooks/dao.hooks'
import yup from '../../yup-extended'

type TFormValues = {
    total: string
    places: string[]
}

type TPrizePoolModalProps = {
    initial_values: TFormValues
    onSubmit(values: { total: number; places: number[] }): Promise<void>
}

const HackathonPrizePoolModal = (props: TPrizePoolModalProps) => {
    const { initial_values, onSubmit } = props
    const dao = useDao()

    const onFormSubmit = async (values: TFormValues, helpers: FormikHelpers<any>) => {
        try {
            // Validate prizes pool
            const total = parseInt(values.total) || 0
            const places = values.places.map((amount) => parseInt(amount) || 0)
            if (total !== _.sum(places)) {
                helpers.setFieldError('places', 'Prize pool divided incorrectly')
                return
            }

            await onSubmit({ total, places })
        } catch (e: any) {
            console.error(e.message)
        }
    }

    return (
        <Dialog.Panel className="relative rounded-xl bg-white p-10 w-full max-w-2xl">
            <Formik
                initialValues={initial_values}
                validationSchema={yup.object().shape({
                    total: yup
                        .number()
                        .integer()
                        .max(dao.details.supply?.reserve || 0)
                        .required(),
                    places: yup.array().of(yup.number().integer().required()).min(1),
                })}
                onSubmit={onFormSubmit}
            >
                {({ isSubmitting, errors }) => (
                    <Form>
                        <ModalCloseButton disabled={isSubmitting} />

                        <h1 className="text-xl font-medium">Prize pool</h1>

                        <div className="mt-4 flex flex-wrap gap-6">
                            <div className="basis-5/12">
                                <Field
                                    name="total"
                                    component={FormikInput}
                                    autoComplete="off"
                                    placeholder="Total amount"
                                    help={`Available ${dao.details.supply?.reserve.toLocaleString()}`}
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="basis-6/12 text-sm text-gray-53596d">
                                the total amount of the prize fund, which is divided among
                                all prize places
                            </div>
                        </div>

                        <div className="mt-10">
                            <h2 className="text-xl font-medium">Prize places</h2>
                            {typeof errors.places === 'string' && (
                                <ErrorMessage
                                    component="div"
                                    name="places"
                                    className="text-xs text-red-ff3b30 mt-1"
                                />
                            )}
                            <FieldArray name="places" component={FieldArrayForm} />
                        </div>

                        <div className="mt-6 text-center">
                            <Button
                                type="submit"
                                isLoading={isSubmitting}
                                disabled={isSubmitting}
                            >
                                Apply changes
                            </Button>
                        </div>
                    </Form>
                )}
            </Formik>
        </Dialog.Panel>
    )
}

const FieldArrayForm = (props: FieldArrayRenderProps | string | void) => {
    const { form, remove, push } = props as FieldArrayRenderProps
    const values = form.values as TFormValues

    return (
        <>
            <div className="flex flex-col gap-y-3">
                <AnimatePresence>
                    {values.places.map((_, index) => {
                        const total = parseInt(values.total) || 1
                        const current = parseInt(values.places[index]) || 0
                        const percent = Math.round((current / total) * 100)

                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.8 }}
                                exit={{ opacity: 0, transition: { duration: 0.4 } }}
                                className={classNames(
                                    'flex items-center gap-x-6',
                                    index === 0 ? 'mt-8' : null,
                                )}
                            >
                                <div className="basis-2/12 font-medium">
                                    Place #{index + 1}
                                </div>
                                <div className="basis-4/12">
                                    <Field
                                        name={`places.${index}`}
                                        component={FormikInput}
                                        placeholder="Amount"
                                        autoComplete="off"
                                        disabled={form.isSubmitting}
                                        after={
                                            <div className="flex items-center pr-3">
                                                <span className="text-sm text-gray-7c8db5">
                                                    {percent}%
                                                </span>
                                            </div>
                                        }
                                    />
                                    {Array.isArray(form.errors.places) && (
                                        <ErrorMessage
                                            className="text-xs text-red-ff3b30 mt-1"
                                            component="div"
                                            name={`places.${index}`}
                                        />
                                    )}
                                </div>
                                <div className="text-right">
                                    <Button
                                        type="button"
                                        variant="custom"
                                        className="!p-1"
                                        disabled={form.isSubmitting}
                                        onClick={() => remove(index)}
                                    >
                                        <FontAwesomeIcon icon={faTimes} size="xl" />
                                    </Button>
                                </div>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>

            <div className="mt-6">
                <Button
                    type="button"
                    variant="custom"
                    size="sm"
                    className="block border !border-blue-2b89ff text-blue-2b89ff !rounded-[2rem]"
                    disabled={form.isSubmitting}
                    onClick={() => push('0')}
                >
                    <FontAwesomeIcon icon={faPlus} className="mr-2" />
                    Add prize place
                </Button>
            </div>
        </>
    )
}

export { HackathonPrizePoolModal }
