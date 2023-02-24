import { TDao, TSmvEvent } from 'react-gosh'
import { IGoshDaoAdapter } from 'react-gosh/dist/gosh/interfaces'
import EVENT_VOTING_FORM_1_0_0 from './1.0.0/VotingForm'
import EVENT_VOTING_FORM_2_0_0 from './2.0.0/VotingForm'

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
        return <EVENT_VOTING_FORM_1_0_0 dao={dao} event={event} />
    }
    return <EVENT_VOTING_FORM_2_0_0 dao={dao} event={event} />
}

export { EventVotingForm }
