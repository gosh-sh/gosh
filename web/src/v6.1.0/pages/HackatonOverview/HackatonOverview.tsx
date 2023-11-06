import {
    HackatonDatesOverview,
    HackatonDescriptionFileForm,
    HackatonParticipantsOverview,
    HackatonPrizePoolOverview,
} from '../../components/Hackaton'

const HackatonOverviewPage = () => {
    return (
        <div className="row flex-wrap">
            <div className="col !basis-full lg:!basis-7/12 flex flex-col gap-y-10">
                <HackatonDescriptionFileForm filename="README.md" />
                <HackatonDescriptionFileForm filename="RULES.md" />
            </div>
            <div className="col !basis-full lg:!basis-5/12">
                <div className="flex flex-col gap-y-5">
                    <div className="border border-gray-e6edff rounded-xl overflow-hidden px-5">
                        <HackatonPrizePoolOverview />
                        <HackatonDatesOverview />
                        <HackatonParticipantsOverview />
                    </div>
                    {/* <hr className="bg-gray-e6edff" />
                    <ExpertsOverview /> */}
                </div>
            </div>
        </div>
    )
}

export default HackatonOverviewPage
