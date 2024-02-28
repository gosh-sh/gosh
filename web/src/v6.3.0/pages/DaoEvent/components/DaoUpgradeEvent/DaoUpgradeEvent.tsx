type TMemberAddEventProps = {
  data: { newversion: string; description: string }
}

const DaoUpgradeEvent = (props: TMemberAddEventProps) => {
  const { data } = props

  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-center gap-6">
        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
          New version
        </div>
        <div className="text-sm">{data.newversion}</div>
      </div>
      <div className="flex items-center gap-6">
        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">Comment</div>
        <div className="text-sm">{data.description}</div>
      </div>
    </div>
  )
}

export { DaoUpgradeEvent }
