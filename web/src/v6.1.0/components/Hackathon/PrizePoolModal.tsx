import { faPlus, faTimes } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Dialog, Tab } from '@headlessui/react'
import classNames from 'classnames'
import {
    ErrorMessage,
    Field,
    FieldArray,
    FieldArrayRenderProps,
    Form,
    Formik,
    FormikHelpers,
    FormikProps,
} from 'formik'
import { AnimatePresence, motion } from 'framer-motion'
import _ from 'lodash'
import { Fragment, useEffect, useRef, useState } from 'react'
import { Button } from '../../../components/Form'
import { FormikInput } from '../../../components/Formik'
import { ModalCloseButton } from '../../../components/Modal'
import { useDao } from '../../hooks/dao.hooks'
import yup from '../../yup-extended'

type TFormValues = {
    total: string
    places: { _motion_id: number; value: string }[]
}

type TPrizePoolModalProps = {
    initial_values: { total: string; places: string[] }
    onSubmit(values: { total: number; places: number[] }): Promise<void>
}

const HackathonPrizePoolModal = (props: TPrizePoolModalProps) => {
    const { initial_values, onSubmit } = props
    const dao = useDao()
    const [distribution, setDistribution] = useState<{
        remains: number
        percent: number
    }>({ remains: 0, percent: 0 })
    const formik_ref = useRef<FormikProps<TFormValues>>(null)
    const [close_dirty, setCloseDirty] = useState<boolean>(false)
    const [close_force, setCloseForce] = useState<boolean>(false)
    const [submitting, setSubmitting] = useState<boolean>(false)

    const initial_form = {
        ...initial_values,
        places:
            initial_values.places.length > 0
                ? initial_values.places.map((value) => ({
                      _motion_id: Math.random(),
                      value,
                  }))
                : [{ _motion_id: Math.random(), value: '0' }],
    }

    const onAmountChange = (values: TFormValues) => {
        const i_total = parseInt(values.total) || 0
        const i_places = values.places.map((item) => parseInt(item.value) || 0)
        const sum_places = _.sum(i_places)
        const sum_percent = _.sum(
            i_places.map((value) => Math.round((value / (i_total || 1)) * 100)),
        )
        setDistribution({ remains: i_total - sum_places, percent: sum_percent })
    }

    const onFormSubmit = async (values: TFormValues, helpers: FormikHelpers<any>) => {
        try {
            // Use local state for submitting flag,
            // because formik_ref.isSubmitting update takes much time
            setSubmitting(true)

            // Validate prizes pool
            const total = parseInt(values.total) || 0
            const places = values.places.map((item) => parseInt(item.value) || 0)
            if (total !== _.sum(places)) {
                helpers.setFieldError('places', 'Prize pool divided incorrectly')
                return
            }

            await onSubmit({ total, places })
        } catch (e: any) {
            console.error(e.message)
        } finally {
            setSubmitting(false)
        }
    }

    useEffect(() => {
        onAmountChange(initial_form)
    }, [])

    useEffect(() => {
        setCloseDirty(!!formik_ref.current?.dirty)
    }, [formik_ref.current?.dirty])

    useEffect(() => {
        setCloseForce(false)
    }, [formik_ref.current?.values])

    return (
        <Dialog.Panel className="relative rounded-xl bg-gray-fafafd w-full max-w-4xl overflow-hidden">
            <div className="p-6 flex flex-wrap items-center justify-between gap-x-6">
                <h1 className="grow text-xl font-medium order-1">Setup prize pool</h1>
                <div className="basis-full lg:basis-auto order-3 lg:order-2">
                    {close_dirty && (
                        <div className="relative">
                            <span
                                className={classNames(
                                    close_force ? 'text-red-ff3b30' : 'text-gray-53596d',
                                )}
                            >
                                You have unsaved changes
                            </span>

                            {close_force && (
                                <div className="absolute left-0 lg:right-0 top-5 text-sm">
                                    Press again to close
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="order-2 lg:order-3">
                    <ModalCloseButton
                        two_factor={close_dirty && !close_force}
                        disabled={submitting}
                        className="relative !top-0 !right-0"
                        twoFactorCallback={() => setCloseForce(true)}
                    />
                </div>
            </div>

            <Formik
                innerRef={formik_ref}
                initialValues={initial_form}
                validationSchema={yup.object().shape({
                    total: yup
                        .number()
                        .typeError('is not a valid number')
                        .integer('is not a valid integer')
                        .max(dao.details.supply?.reserve || 0)
                        .required(),
                    places: yup
                        .array()
                        .of(
                            yup.object().shape({
                                value: yup
                                    .number()
                                    .typeError('is not a valid number')
                                    .integer('is not a valid integer')
                                    .required(),
                            }),
                        )
                        .min(1),
                })}
                onSubmit={onFormSubmit}
            >
                {({ isSubmitting, values, errors, dirty, isValid }) => (
                    <Form>
                        <Tab.Group>
                            <Tab.List className="px-6 lg:px-2 pb-4 lg:pb-0">
                                <Tab as={Fragment}>
                                    {({ selected }) => (
                                        <button
                                            className={classNames(
                                                'px-5 py-2 text-gray-53596d rounded-t-lg border-x border-t',
                                                'border-b lg:border-b-0 rounded-b-lg lg:rounded-b-none',
                                                selected
                                                    ? 'border-gray-e6edff bg-white'
                                                    : 'border-transparent bg-transparent',
                                            )}
                                        >
                                            DAO tokens
                                        </button>
                                    )}
                                </Tab>
                            </Tab.List>
                            <Tab.Panels
                                className="bg-white mt-0 lg:-mt-px p-5 lg:p-10
                                border-t border-t-gray-e6edff"
                            >
                                <Tab.Panel>
                                    <div>
                                        <h2 className="mb-4 text-xl font-medium">
                                            Amount
                                        </h2>
                                        <Field
                                            className="inline-flex w-full lg:w-auto"
                                            name="total"
                                            component={FormikInput}
                                            autoComplete="off"
                                            placeholder="Amount"
                                            help={`Available ${dao.details.supply?.reserve.toLocaleString()}`}
                                            disabled={isSubmitting}
                                            onKeyUp={() => onAmountChange(values)}
                                        />
                                    </div>

                                    <div
                                        className={classNames(
                                            'mt-10 transition-opacity duration-200',
                                            values.total ? 'opacity-100' : 'opacity-20',
                                        )}
                                    >
                                        <h2 className="mb-4 text-xl font-medium">
                                            Prize places
                                        </h2>
                                        <div
                                            className="flex flex-wrap justify-between overflow-hidden
                                            border border-gray-e6edff rounded-xl bg-gray-fafafd"
                                        >
                                            <div
                                                className="basis-full lg:basis-8/12 rounded-xl bg-white
                                                order-2 lg:order-1"
                                            >
                                                <FieldArray
                                                    name="places"
                                                    render={(helpers: any) => (
                                                        <FieldArrayForm
                                                            {...helpers}
                                                            onAmountChange={
                                                                onAmountChange
                                                            }
                                                        />
                                                    )}
                                                    onKeyUp={() => onAmountChange(values)}
                                                />
                                            </div>
                                            <div
                                                className="basis-full lg:basis-4/12 self-center px-5 lg:px-10 py-10
                                                order-1 lg:order-2 text-start lg:text-center"
                                            >
                                                <div className="mb-2 text-2xl">
                                                    {distribution.remains.toLocaleString()}
                                                    <span className="ml-2 text-base text-gray-53596d">
                                                        {distribution.percent}%
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-53596d">
                                                    remains to be distributed
                                                </div>
                                                {typeof errors.places === 'string' && (
                                                    <ErrorMessage
                                                        component="div"
                                                        name="places"
                                                        className="text-xs text-red-ff3b30 mt-1"
                                                    />
                                                )}
                                                <div className="mt-6 text-center">
                                                    <Button
                                                        type="submit"
                                                        className="w-full lg:w-auto"
                                                        isLoading={isSubmitting}
                                                        disabled={
                                                            isSubmitting ||
                                                            !dirty ||
                                                            !isValid
                                                        }
                                                    >
                                                        Save distribution
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Tab.Panel>
                            </Tab.Panels>
                        </Tab.Group>
                    </Form>
                )}
            </Formik>
        </Dialog.Panel>
    )
}

type TFieldArrayFormProps = FieldArrayRenderProps & {
    onAmountChange(values: TFormValues): void
}

const FieldArrayForm = (props: TFieldArrayFormProps) => {
    const { form, remove, push, onAmountChange } = props
    const values = form.values as TFormValues
    const total = parseInt(values.total) || 1
    const ref = useRef<HTMLDivElement>(null)
    const ref_count = useRef<number>(values.places.length)
    const disabled = !values.total || form.isSubmitting

    const onPlaceAdd = () => {
        push({ _motion_id: Date.now(), value: '0' })
    }

    const onPlaceRemove = (index: number) => {
        ref_count.current -= 1
        remove(index)
    }

    useEffect(() => {
        onAmountChange(values)

        if (values.places.length > ref_count.current) {
            ref_count.current = values.places.length
            ref.current?.scroll({
                top: ref.current?.scrollHeight,
                behavior: 'smooth',
            })
        }
    }, [values.places.length])

    return (
        <div className="py-5">
            <div ref={ref} className="px-6 flex flex-col gap-y-4 h-48 overflow-y-auto">
                <AnimatePresence>
                    {values.places.map((item, index) => {
                        const current = parseInt(item.value) || 0
                        const percent = Math.round((current / total) * 100)

                        return (
                            <motion.div
                                key={item._motion_id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.8 }}
                                exit={{ opacity: 0, transition: { duration: 0.4 } }}
                                className="flex flex-wrap items-center gap-x-6 gap-y-2.5"
                            >
                                <div className="basis-10/12 lg:basis-3/12 grow lg:grow-0 font-medium order-1">
                                    Place #{index + 1}
                                </div>
                                <div className="basis-9/12 lg:basis-4/12 order-3 lg:order-2">
                                    <Field
                                        name={`places.${index}.value`}
                                        component={FormikInput}
                                        placeholder="Amount"
                                        autoComplete="off"
                                        disabled={disabled}
                                        onKeyUp={() => onAmountChange(values)}
                                    />
                                    {Array.isArray(form.errors.places) && (
                                        <ErrorMessage
                                            className="text-xs text-red-ff3b30 mt-1"
                                            component="div"
                                            name={`places.${index}.value`}
                                        />
                                    )}
                                </div>
                                <div className="grow order-4 lg:order-3 text-end lg:text-start">
                                    {percent}%
                                </div>
                                <div className="text-right order-2 lg:order-4">
                                    <Button
                                        type="button"
                                        variant="custom"
                                        className="!p-1 text-gray-53596d"
                                        disabled={disabled}
                                        onClick={() => onPlaceRemove(index)}
                                    >
                                        <FontAwesomeIcon icon={faTimes} size="lg" />
                                    </Button>
                                </div>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>

            <div className="mt-6 px-6">
                <Button
                    type="button"
                    variant="custom"
                    className="block w-full border !border-blue-2b89ff text-blue-2b89ff !rounded-[2rem]"
                    disabled={disabled}
                    onClick={onPlaceAdd}
                >
                    <FontAwesomeIcon icon={faPlus} className="mr-2" />
                    Add prize place
                </Button>
            </div>
        </div>
    )
}

export { HackathonPrizePoolModal }
