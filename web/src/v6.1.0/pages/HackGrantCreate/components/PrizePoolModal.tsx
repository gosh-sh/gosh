import { Dialog } from '@headlessui/react'
import {
    ErrorMessage,
    Field,
    FieldArray,
    FieldArrayRenderProps,
    Form,
    Formik,
} from 'formik'
import yup from '../../../yup-extended'
import { ModalCloseButton } from '../../../../components/Modal'
import { FormikInput } from '../../../../components/Formik'
import { Button } from '../../../../components/Form'
import { AnimatePresence, motion } from 'framer-motion'
import classNames from 'classnames'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTimes } from '@fortawesome/free-solid-svg-icons'

type TFormValues = {
    total: string
    places: string[]
}

const PrizePoolModal = () => {
    const onSubmit = () => {}

    return (
        <Dialog.Panel className="relative rounded-xl bg-white p-10 w-full max-w-2xl">
            <Formik
                initialValues={{
                    total: '',
                    places: [],
                }}
                validationSchema={yup.object().shape({})}
                onSubmit={onSubmit}
            >
                {({ isSubmitting }) => (
                    <Form>
                        <ModalCloseButton />

                        <h1 className="text-xl font-medium">Prize pool</h1>

                        <div className="mt-4 flex flex-wrap gap-6">
                            <div className="basis-5/12">
                                <Field
                                    name="amount"
                                    component={FormikInput}
                                    autoComplete="off"
                                    placeholder="Total amount"
                                    help="Available 100,000"
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
                    {values.places.map((_, index) => (
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
                            <div>
                                <Field
                                    name={`places.${index}`}
                                    component={FormikInput}
                                    placeholder="Amount"
                                    autoComplete="off"
                                    disabled={form.isSubmitting}
                                />
                                <ErrorMessage
                                    className="text-xs text-red-ff3b30 mt-1"
                                    component="div"
                                    name={`places.${index}`}
                                />
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
                    ))}
                </AnimatePresence>
            </div>

            <div className="mt-6">
                <Button
                    type="button"
                    variant="custom"
                    size="sm"
                    className="block border !border-blue-2b89ff text-blue-2b89ff !rounded-[2rem]"
                    onClick={() => push('0')}
                >
                    <FontAwesomeIcon icon={faPlus} className="mr-2" />
                    Add prize place
                </Button>
            </div>
        </>
    )
}

export { PrizePoolModal }
