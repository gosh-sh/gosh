import { TSmvEvent } from 'react-gosh'
import MemberAddEvent_1_0_0 from './1.0.0/MemberAddEvent'
import MemberAddEvent_1_1_0 from './1.1.0/MemberAddEvent'

type TMemberEventProps = {
    version: string
    event: TSmvEvent
}

const MemberAddEvent = (props: TMemberEventProps) => {
    const { version, event } = props

    if (version === '1.0.0') {
        return <MemberAddEvent_1_0_0 event={event} />
    }
    if (version === '1.1.0') {
        return <MemberAddEvent_1_1_0 event={event} />
    }
    return null
}

export { MemberAddEvent }
