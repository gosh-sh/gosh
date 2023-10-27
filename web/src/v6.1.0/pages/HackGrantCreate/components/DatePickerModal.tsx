import { Dialog } from '@headlessui/react'
import { Calendar } from 'react-multi-date-picker'
import { Button } from '../../../../components/Form'
import TimePicker from 'react-multi-date-picker/plugins/time_picker'
import { ModalCloseButton } from '../../../../components/Modal'

const DatePickerModal = () => {
    return (
        <Dialog.Panel className="relative rounded-xl bg-white p-10 w-full max-w-sm">
            <ModalCloseButton />

            <Calendar
                className="date-picker-fw mt-4 !border-none"
                shadow={false}
                showOtherDays
                plugins={[<TimePicker position="bottom" />]}
            />

            <div className="mt-6 text-center">
                <Button type="button">Apply date</Button>
            </div>
        </Dialog.Panel>
    )
}

export { DatePickerModal }
