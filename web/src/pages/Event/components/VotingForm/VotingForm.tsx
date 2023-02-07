import { TDao, TSmvEvent } from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import EventVotingForm_1_0_0 from './1.0.0/VotingForm'
import EventVotingForm_1_1_0 from './1.1.0/VotingForm'

type TVotingFormProps = {
    dao: {
        adapter: IGoshDaoAdapter
        details: TDao
    }
    event: TSmvEvent
}

const EventVotingForm = (props: TVotingFormProps) => {
    const { dao, event } = props
    const version = dao.details.version
    if (version === '1.0.0') {
        return <EventVotingForm_1_0_0 dao={dao} event={event} />
    }
    if (version === '1.1.0') {
        return <EventVotingForm_1_1_0 dao={dao} event={event} />
    }
    return null
}

export { EventVotingForm }
