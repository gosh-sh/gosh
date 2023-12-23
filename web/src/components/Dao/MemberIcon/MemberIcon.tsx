import {
  IconDefinition,
  faBuildingColumns,
  faEnvelope,
  faUser,
} from '@fortawesome/free-solid-svg-icons'
import { IconProp } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon, FontAwesomeIconProps } from '@fortawesome/react-fontawesome'

const icons: { [type: string]: IconDefinition } = {
  user: faUser,
  dao: faBuildingColumns,
  email: faEnvelope,
}

type TMemberIconProps = Omit<FontAwesomeIconProps, 'icon'> & {
  type: 'user' | 'dao' | 'email'
  icon?: IconProp
}

const MemberIcon = (props: TMemberIconProps) => {
  const { type, icon, ...rest } = props

  return <FontAwesomeIcon icon={icon || icons[type]} {...rest} />
}

export { MemberIcon }
