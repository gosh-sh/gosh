import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDao, useUpgradeDao } from '../../hooks/dao.hooks'
import Alert from '../../../components/Alert'
import { AnimatePresence, motion } from 'framer-motion'
import classNames from 'classnames'
import { Button } from '../../../components/Form'
import { useSetRecoilState } from 'recoil'
import { appModalStateAtom } from '../../../store/app.state'
import { DaoUpgradeCompleteModal } from '../Modal'

type TDaoNotificationProps = React.HTMLAttributes<HTMLDivElement>

const DaoUpgradeNotification = (props: TDaoNotificationProps) => {
  const { className } = props
  const setModal = useSetRecoilState(appModalStateAtom)
  const dao = useDao()
  const { alert } = useUpgradeDao()
  const [show, setShow] = useState<boolean>(true)

  const onDismiss = () => setShow(false)

  const onCompleteUpgrade = () => {
    setModal({
      static: true,
      isOpen: true,
      element: <DaoUpgradeCompleteModal />,
    })
  }

  useEffect(() => {
    if (alert) {
      setShow(true)
    }
  }, [alert])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={classNames(className)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {alert === 'isUpgradeAvailable' && (
            <Alert variant="danger" dismiss onDismiss={onDismiss}>
              A new version of DAO is available.
              <br />
              Please complete all proposals before upgrading.
              <br />
              <b>
                All uncompleted proposals will be rejected and will not be transferred to
                the upgraded version.
              </b>
              <br />
              Please check that a corresponding proposal does not exist before going to
              the{' '}
              <Link className="underline" to={`/o/${dao.details.name}/settings/upgrade`}>
                DAO upgrade
              </Link>{' '}
              page.
            </Alert>
          )}

          {alert === 'isNotLatest' && (
            <Alert variant="warning">
              You are using old version of DAO.
              <br />
              <button
                className="underline"
                onClick={() => {
                  document.location = `/o/${dao.details.name}`
                }}
              >
                Reload
              </button>{' '}
              page to go to the latest version
            </Alert>
          )}

          {alert === 'isUpgradeUncompleted' && (
            <Alert variant="danger">
              <h1 className="font-medium">DAO has been upgraded</h1>
              <div>
                Upgrade process must be completed to continue using DAO
                <Button
                  size="sm"
                  variant="outline-danger"
                  className="block mt-2"
                  onClick={onCompleteUpgrade}
                >
                  Complete upgrade
                </Button>
              </div>
            </Alert>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export { DaoUpgradeNotification }
