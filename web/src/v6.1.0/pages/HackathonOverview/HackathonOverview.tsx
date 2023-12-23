import { faBookmark } from '@fortawesome/free-regular-svg-icons'
import {
  HackathonDatesOverview,
  HackathonDescriptionFileForm,
  HackathonParticipantsOverview,
  HackathonPrizePoolOverview,
} from '../../components/Hackathon'

const HackathonOverviewPage = () => {
  return (
    <div className="row flex-wrap lg:flex-nowrap">
      <div className="col !basis-full lg:!basis-7/12 xl:!basis-8/12 flex flex-col gap-y-10">
        <HackathonDescriptionFileForm
          filename="RULES.md"
          icon={faBookmark}
          initial_collapsed
        />
        <HackathonDescriptionFileForm filename="README.md" />
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

export default HackathonOverviewPage
