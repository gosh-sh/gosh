import randomColor from 'randomcolor'
import Select, { MultiValue } from 'react-select'
import { Select2ClassNames } from '../../../../helpers'
import { useDao } from '../../../hooks/dao.hooks'

type THackathonExpertsOverviewProps = {
    values: { label: string; value: string }[]
    onChange(option: MultiValue<{ label: string; value: string }>): void
}

const HackathonExpertsOverview = (props: THackathonExpertsOverviewProps) => {
    const { values, onChange } = props
    const dao = useDao()

    return (
        <div className="border border-gray-e6edff rounded-xl px-5">
            <div className="py-4 w-full flex items-center justify-between border-b border-b-gray-e6edff">
                <div className="font-medium">Expert tags</div>
            </div>

            <div className="py-4">
                <Select
                    value={values}
                    options={dao.details.expert_tags?.map((item) => ({
                        label: item.name,
                        value: item.name,
                    }))}
                    isMulti
                    isClearable={true}
                    placeholder="Expert tags"
                    classNames={{
                        ...Select2ClassNames,
                        valueContainer: () => '!p-1',
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
                    onChange={(option) => onChange(option)}
                />
            </div>
        </div>
    )
}

export { HackathonExpertsOverview }
