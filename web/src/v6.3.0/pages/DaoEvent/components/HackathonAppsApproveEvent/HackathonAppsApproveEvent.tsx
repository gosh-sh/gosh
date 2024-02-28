import { getIdenticonAvatar } from '../../../../../helpers'

type THackathonAppsApproveEventProps = {
  data: any
}

const HackathonAppsApproveEvent = (props: THackathonAppsApproveEventProps) => {
  const { data } = props

  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-center gap-6">
        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
          Hackathon name
        </div>
        <div className="text-sm">{data.name}</div>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="basis-full text-xs text-gray-53596d">Submitted applications</div>
        <div className="flex flex-col gap-2">
          {data.details.map((item: any, index: number) => (
            <div key={index} className="flex items-center flex-wrap gap-2">
              <div className="w-6">
                <img
                  src={getIdenticonAvatar({
                    seed: item.dao_name,
                    radius: 50,
                  }).toDataUriSync()}
                  alt=""
                  className="w-full"
                />
              </div>
              <div className="text-sm">
                <span>{item.dao_name}</span>
                <span className="mx-1">/</span>
                <span>{item.repo_name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export { HackathonAppsApproveEvent }
