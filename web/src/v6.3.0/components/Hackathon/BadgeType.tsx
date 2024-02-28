import classNames from 'classnames'
import { EHackathonType } from '../../types/hackathon.types'
import { Badge } from '../Badge'

const background_colors = {
  [EHackathonType.HACKATHON]: 'bg-blue-2b89ff',
  [EHackathonType.GRANT]: 'bg-red-ff6c4d',
}

const HackathonTypeBadge = (props: { type: EHackathonType }) => {
  const { type } = props

  return (
    <Badge className={classNames(background_colors[type], 'capitalize')} content={type} />
  )
}

export { HackathonTypeBadge }
