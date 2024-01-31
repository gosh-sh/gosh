import { faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import classNames from 'classnames'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../../../components/Form'
import { useApplicationForm } from '../../../hooks/hackathon.hooks'

type TApplicationFormProps = React.HTMLAttributes<HTMLDivElement> & {
  application_data?: any
}

const ApplicationForm = (props: TApplicationFormProps) => {
  const { application_data, className } = props
  const keypair = {
    public: 'dc589cebfbe1feabd528231799c3a2d1d6f2e58a2288ee9facdea2a9f275133c',
    secret: '9bc7b57dd7f38218eaa37cc79fc2a872b3b36c0fc9bf2bfaa313c39fc45946b9',
  }
  const [data, setData] = useState<any[]>([])
  const [opened, setOpened] = useState<boolean>(false)
  const { decrypt } = useApplicationForm()

  const toggleData = () => {
    setOpened(!opened)
  }

  const decryptData = useCallback(async () => {
    if (!application_data) {
      return
    }

    try {
      const decrypted = await decrypt({
        keypair_user: keypair,
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

  if (!application_data || data.length === 0) {
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
