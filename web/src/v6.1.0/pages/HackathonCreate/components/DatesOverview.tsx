import { IconDefinition, faCalendarAlt } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import moment from 'moment'
import { useSetRecoilState } from 'recoil'
import { Button } from '../../../../components/Form'
import { appModalStateAtom } from '../../../../store/app.state'
import { HackathonDatesModal } from '../../../components/Hackathon'

type TDatesOverviewProps = {
    initial_values: { key: string; title: string; icon: IconDefinition; time: number }[]
    onSubmit(values: { [k: string]: number }): Promise<void>
}

const DatesOverview = (props: TDatesOverviewProps) => {
    const { initial_values, onSubmit } = props
    const setModal = useSetRecoilState(appModalStateAtom)

    const onUpdateDatesModal = (tab_index?: number) => {
        const obj = Object.fromEntries(
            initial_values.map((item) => [item.key, item.time]),
        )

        setModal({
            static: false,
            isOpen: true,
            element: (
                <HackathonDatesModal
                    initial_values={obj}
                    tab_index={tab_index}
                    onSubmit={async (values) => {
                        await onSubmit(values)
                        setModal((state) => ({ ...state, isOpen: false }))
                    }}
                />
            ),
        })
    }

    return (
        <div className="flex flex-col gap-y-4 py-5 border-b border-b-gray-e6edff">
            {initial_values.map(({ key, title, icon, time }, index) => (
                <div key={key} className="flex items-center justify-between gap-x-5">
                    <div className="grow font-medium whitespace-nowrap">
                        <FontAwesomeIcon icon={icon} fixedWidth className="mr-2" />
                        {title}
                    </div>
                    <div className="flex items-center justify-end gap-x-3">
                        {time > 0 && (
                            <div className="text-xs">
                                {moment.unix(time).format('MMM D, YYYY HH:mm:ss')}
                            </div>
                        )}

                        <Button
                            type="button"
                            variant="custom"
                            size="sm"
                            className="block border !border-blue-2b89ff text-blue-2b89ff !rounded-[2rem]"
                            onClick={() => onUpdateDatesModal(index)}
                        >
                            {time > 0 ? 'Edit' : 'Add date'}
                            <FontAwesomeIcon icon={faCalendarAlt} className="ml-2" />
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    )
}

export { DatesOverview }
