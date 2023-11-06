import classNames from 'classnames'
import { EHackatonType } from '../../types/hackaton.types'
import { Badge } from '../Badge'

const background_colors = {
    [EHackatonType.HACKATON]: 'bg-blue-2b89ff',
    [EHackatonType.GRANT]: 'bg-red-ff6c4d',
}

const HackatonTypeBadge = (props: { type: EHackatonType }) => {
    const { type } = props

    return (
        <Badge
            className={classNames(background_colors[type], 'capitalize')}
            content={type}
        />
    )
}

export { HackatonTypeBadge }
