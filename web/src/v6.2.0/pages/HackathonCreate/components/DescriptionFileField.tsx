import { faBookmark } from '@fortawesome/free-regular-svg-icons'
import {
  IconDefinition,
  faAward,
  faBook,
  faChevronUp,
  faList,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import classNames from 'classnames'
import { Field } from 'formik'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { BaseField } from '../../../../components/Formik'
import { Editor } from '../../../components/Hackathon'

const data: {
  [k: string]: { title: string; field_name: string; icon: IconDefinition; hint: string }
} = {
  readme: {
    title: 'README.md',
    field_name: 'description.readme',
    icon: faList,
    hint: 'Tell the world about your Hacks & Grants program. What are its aims? Who should participate? How will it work?',
  },
  rules: {
    title: 'RULES.md',
    field_name: 'description.rules',
    icon: faBookmark,
    hint: 'You are the lawgiver for your program. What are the rules participants must follow? What is expected, allowed, and strictly forbidden?',
  },
  prize: {
    title: 'PRIZES.md',
    field_name: 'description.prize',
    icon: faAward,
    hint: 'Hackathons and Grant Programs can be lucrative. So how are the prizes for yours going to be distributed? What are the criteria for success?',
  },
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
          <span className="text-blue-2b89ff font-medium">{data[type].title}</span>
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
      <div className="flex items-start gap-x-4 p-5 bg-gray-fafafd border-t border-gray-e6edff">
        <div className="text-gray-7c8db5">
          <FontAwesomeIcon icon={faBook} />
        </div>
        <div>{data[type].hint}</div>
      </div>
    </div>
  )
}

export { DescriptionFileField }
