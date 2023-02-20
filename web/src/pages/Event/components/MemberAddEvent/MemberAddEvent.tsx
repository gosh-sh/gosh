import MEMBER_ADD_EVENT_1_0_0 from './1.0.0/MemberAddEvent'
import MEMBER_ADD_EVENT_2_0_0 from './2.0.0/MemberAddEvent'

type TMemberEventProps = {
    version: string
    data: any
}

const MemberAddEvent = (props: TMemberEventProps) => {
    const { version, data } = props

    if (version === '1.0.0') {
        return <MEMBER_ADD_EVENT_1_0_0 data={data} />
    }
    return <MEMBER_ADD_EVENT_2_0_0 data={data} />
}

export { MemberAddEvent }
