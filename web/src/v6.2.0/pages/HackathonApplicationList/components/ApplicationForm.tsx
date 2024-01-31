import { faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import classNames from 'classnames'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../../../components/Form'
import { useApplicationForm } from '../../../hooks/hackathon.hooks'
import { useUser } from '../../../hooks/user.hooks'

type TApplicationFormProps = React.HTMLAttributes<HTMLDivElement> & {
  application_data?: any
}

const ApplicationForm = (props: TApplicationFormProps) => {
  const { application_data, className } = props
  const { user } = useUser()
  const [data, setData] = useState<any[] | null>(null)
  const [opened, setOpened] = useState<boolean>(false)
  const { decrypt } = useApplicationForm()

  const toggleData = () => {
    setOpened(!opened)
  }

  const decryptData = useCallback(async () => {
    if (!application_data || !user.keys) {
      return
    }

    try {
      const decrypted = await decrypt({
        user_keypair: user.keys,
        application_form: application_data,
      })
      setData(decrypted)
    } catch (e: any) {
      console.error(`ApplicationForm: error decrypt application data - ${e.message}`)
    }
  }, [application_data?.nonce])

  useEffect(() => {
    decryptData()
  }, [decryptData])

  if (!application_data || !data) {
    return null
  }

  return (
    <div className={classNames(className)}>
      <Button variant="custom" className="!px-0 text-gray-53596d" onClick={toggleData}>
        <span className="text-sm">Application form</span>
        <FontAwesomeIcon
          icon={faChevronDown}
          size="xs"
          className={classNames(
            'ml-2 transition-transform duration-300',
            opened ? 'rotate-180' : 'rotate-0',
          )}
        />
      </Button>

      <AnimatePresence>
        {opened ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col text-gray-53596d overflow-hidden"
          >
            {data.map((field, index) => (
              <div key={index} className="text-xs">
                {field.label}: {field.value}
              </div>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export default ApplicationForm
