import {
    HackathonDatesOverview,
    HackathonDescriptionFileForm,
    HackathonParticipantsOverview,
    HackathonPrizePoolOverview,
} from '../../components/Hackathon'

const HackathonRewardPage = () => {
    return (
        <div className="row flex-wrap">
            <div className="col !basis-full lg:!basis-7/12">
                <HackathonDescriptionFileForm filename="PRIZE.md" />
            </div>
            <div className="col !basis-full lg:!basis-5/12">
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
