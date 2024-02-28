import { ChangeEvent } from 'react'
import { Checkbox } from '../../../components/Form'
import { NotificationType } from '../../../constants'
import { useDao } from '../../hooks/dao.hooks'
import { useDaoNotificationSettings } from '../../hooks/notification.hooks'

const DaoNotificationsPage = () => {
  const dao = useDao()
  const { daoSettings, updateDaoSettings } = useDaoNotificationSettings({
    initialize: true,
    daoname: dao.details.name,
  })

  const onNotificationChange = async (e: ChangeEvent<HTMLInputElement>) => {
    try {
      await updateDaoSettings({
        daoname: dao.details.name!,
        types: { [e.target.name]: e.target.checked },
      })
    } catch (e: any) {
      console.error(e.message)
    }
  }

  return (
    <div>
      <h3 className="text-xl font-medium mb-8">DAO updates notifications</h3>
      <div className="flex flex-col gap-y-8">
        {Object.keys(NotificationType).map((key) => (
          <div key={key}>
            <Checkbox
              name={key}
              label={NotificationType[key]}
              className="!inline-block"
              checked={!!daoSettings.data?.types[key]}
              disabled={daoSettings.isFetching}
              onChange={onNotificationChange}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default DaoNotificationsPage
