import { faBookmark } from '@fortawesome/free-regular-svg-icons'
import { IconDefinition, faChevronUp, faList } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import classNames from 'classnames'
import { Field } from 'formik'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { BaseField } from '../../../../components/Formik'
import { Editor } from '../../../components/Hackathon'

const data: { [k: string]: { title: string; field_name: string; icon: IconDefinition } } =
    {
        readme: { title: 'README.md', field_name: 'description.readme', icon: faList },
        rules: { title: 'RULES.md', field_name: 'description.rules', icon: faBookmark },
        prize: { title: 'PRIZES.md', field_name: 'description.prize', icon: faList },
    }

type TDescriptionFileFieldProps = React.HTMLAttributes<HTMLDivElement> & {
    type: 'readme' | 'rules' | 'prize'
    value?: string
    onChange(content: string): void
}

const DescriptionFileField = (props: TDescriptionFileFieldProps) => {
    const { className, type, value, onChange } = props
    const [is_open, setIsOpen] = useState<boolean>(true)

    const onOpenToggle = () => {
        setIsOpen(!is_open)
    }

    return (
        <div
            className={classNames(
                'border border-gray-e6edff rounded-xl overflow-hidden',
                className,
            )}
        >
            <div
                className="px-5 flex flex-nowrap gap-x-4 items-center cursor-pointer"
                onClick={onOpenToggle}
            >
                <div className="grow py-5">
                    <FontAwesomeIcon
                        icon={data[type].icon}
                        size="sm"
                        className="mr-4 text-gray-7c8db5"
                    />
                    <span className="text-blue-2b89ff font-medium">
                        {data[type].title}
                    </span>
                </div>
                <div className="text-sm text-gray-7c8db5">
                    <FontAwesomeIcon
                        icon={faChevronUp}
                        className={classNames(
                            'transition-transform duration-200',
                            is_open ? 'rotate-0' : 'rotate-180',
                        )}
                    />
                </div>
            </div>
            <AnimatePresence>
                {is_open && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                    >
                        <Field name={data[type].field_name} component={BaseField}>
                            <Editor
                                className="sun-editor--noborder"
                                defaultValue={value}
                                onChange={onChange}
                            />
                        </Field>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export { DescriptionFileField }
