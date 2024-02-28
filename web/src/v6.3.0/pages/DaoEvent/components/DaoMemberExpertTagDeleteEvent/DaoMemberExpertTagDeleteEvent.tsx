import { BadgeExpertTag } from '../../../../components/Badge'

type TDaoMemberExpertTagDeleteEventProps = {
  data: { tag: string; pubaddr: { username: string; profile: string }[] }
}

const DaoMemberExpertTagDeleteEvent = (props: TDaoMemberExpertTagDeleteEventProps) => {
  const { data } = props

  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-center gap-6">
        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
          {data.pubaddr[0].username}
        </div>
        <div className="text-sm">
          <BadgeExpertTag content={data.tag} className="py-2 px-3" />
        </div>
      </div>
    </div>
  )
}

export { DaoMemberExpertTagDeleteEvent }
