import { TSmvEvent } from 'react-gosh'
import MEMBER_ADD_EVENT_1_0_0 from './1.0.0/MemberAddEvent'
import MEMBER_ADD_EVENT_2_0_0 from './2.0.0/MemberAddEvent'

type TMemberEventProps = {
    version: string
    event: TSmvEvent
}

const MemberAddEvent = (props: TMemberEventProps) => {
    const { version, event } = props

    if (version === '1.0.0') {
        return <MEMBER_ADD_EVENT_1_0_0 event={event} />
    }
    return <MEMBER_ADD_EVENT_2_0_0 event={event} />
}

export { MemberAddEvent }
