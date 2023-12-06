import { faAward } from '@fortawesome/free-solid-svg-icons'
import {
    HackathonDatesOverview,
    HackathonDescriptionFileForm,
    HackathonParticipantsOverview,
    HackathonPrizePoolOverview,
} from '../../components/Hackathon'

const HackathonRewardPage = () => {
    return (
        <div className="row flex-wrap lg:flex-nowrap">
            <div className="col !basis-full lg:!basis-7/12 xl:!basis-8/12">
                <HackathonDescriptionFileForm
                    title="Rewards"
                    filename="PRIZES.md"
                    mapping_key="prizes"
                    icon={faAward}
                />
            </div>
            <div className="col !basis-full lg:!basis-5/12 xl:!basis-4/12">
                <div className="flex flex-col gap-y-5">
                    <div className="border border-gray-e6edff rounded-xl overflow-hidden px-5">
                        <HackathonPrizePoolOverview />
                        <HackathonDatesOverview />
                        <HackathonParticipantsOverview />
                    </div>
                    {/* <hr className="bg-gray-e6edff" />
                    <ExpertsOverview /> */}
                </div>
            </div>
        </div>
    )
}

export default HackathonRewardPage
