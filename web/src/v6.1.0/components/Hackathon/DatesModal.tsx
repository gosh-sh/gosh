import { Dialog, Tab } from '@headlessui/react'
import classNames from 'classnames'
import { ErrorMessage, Form, Formik, FormikHelpers } from 'formik'
import { AnimatePresence, Variants, motion } from 'framer-motion'
import { Fragment, useState } from 'react'
import { Calendar } from 'react-multi-date-picker'
import TimePicker from 'react-multi-date-picker/plugins/time_picker'
import { Button } from '../../../components/Form'
import { ModalCloseButton } from '../../../components/Modal'

type DatePickerModalProps = {
    initial_values: { [k: string]: number }
    tab_index?: number
    onSubmit(values: { [k: string]: number }): Promise<void>
}

const variants: Variants = {
    initial: (params: any) => ({
        x: params.dir ? '100%' : '-100%',
        opacity: 0,
    }),
    animate: {
        x: 0,
        opacity: 1,
        transition: { type: 'ease-in' },
    },
    exit: (params: any) => ({
        x: params.dir ? '-100%' : '100%',
        opacity: 0,
        transition: { type: 'ease-in' },
    }),
}

const tabs = [
    { key: 'start', title: 'Start' },
    { key: 'voting', title: 'Voting' },
    { key: 'finish', title: 'Finish' },
]

const HackathonDatesModal = (props: DatePickerModalProps) => {
    const { initial_values, tab_index = 0, onSubmit } = props
    const [tab_active, setTabActive] = useState<{ index: number; dir: boolean }>({
        index: tab_index,
        dir: true,
    })

    const onTabChange = (index: number) => {
        setTabActive((state) => ({ ...state, index, dir: index > state.index }))
    }

    const onFormSubmit = async (
        values: typeof initial_values,
        helpers: FormikHelpers<any>,
    ) => {
        const { start, voting, finish } = values

        try {
            if (start > Math.min(voting, finish)) {
                helpers.setFieldError('start', 'Start date is greater than other dates')
                return
            }
            if (voting > finish) {
                helpers.setFieldError('start', 'Voting date is greater than finish date')
                return
            }

            await onSubmit(values)
        } catch (e: any) {
            console.error(e.message)
        }
    }

    return (
        <Dialog.Panel className="relative rounded-xl bg-white p-10 w-full max-w-sm overflow-hidden">
            <Formik initialValues={initial_values} onSubmit={onFormSubmit}>
                {({ isSubmitting, values, setFieldValue }) => (
                    <Form>
                        <ModalCloseButton />

                        <Tab.Group
                            as="div"
                            className="mt-4"
                            selectedIndex={tab_active.index}
                            onChange={onTabChange}
                        >
                            <Tab.List
                                as="div"
                                className="flex gap-x-8 mb-6 overflow-x-auto no-scrollbar
                                border-b border-b-gray-e6edff text-sm"
                            >
                                {tabs.map(({ title }) => (
                                    <Tab key={title} as={Fragment}>
                                        {({ selected }) => (
                                            <Button
                                                variant="custom"
                                                className={classNames(
                                                    'grow pt-1.5 pb-2 border-b-2 !rounded-none',
                                                    'hover:text-black hover:border-b-black transition-colors duration-200',
                                                    selected
                                                        ? 'text-black border-b-black'
                                                        : 'text-gray-7c8db5 border-b-transparent',
                                                )}
                                            >
                                                {title}
                                            </Button>
                                        )}
                                    </Tab>
                                ))}
                            </Tab.List>

                            <Tab.Panels
                                as={AnimatePresence}
                                mode="popLayout"
                                initial={false}
                                custom={{ dir: tab_active.dir }}
                            >
                                <motion.div
                                    key={tab_active.index}
                                    variants={variants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    custom={{ dir: tab_active.dir }}
                                >
                                    <Calendar
                                        className="date-picker-fw mt-4 !border-none"
                                        shadow={false}
                                        showOtherDays
                                        plugins={[<TimePicker position="bottom" />]}
                                        value={values[tabs[tab_active.index].key] * 1000}
                                        disabled={isSubmitting}
                                        onChange={(selected) => {
                                            const key = tabs[tab_active.index].key
                                            const value = selected?.valueOf() as number
                                            const seconds = Math.round(value / 1000)
                                            setFieldValue(key, seconds || 0)
                                        }}
                                    />
                                </motion.div>
                            </Tab.Panels>
                        </Tab.Group>

                        <div className="mt-6 text-sm text-red-ff3b30 text-center">
                            <ErrorMessage name="start" />
                            <ErrorMessage name="voting" />
                            <ErrorMessage name="finish" />
                        </div>

                        <div className="mt-6 text-center">
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                isLoading={isSubmitting}
                            >
                                Apply dates
                            </Button>
                        </div>
                    </Form>
                )}
            </Formik>
        </Dialog.Panel>
    )
}

export { HackathonDatesModal }
