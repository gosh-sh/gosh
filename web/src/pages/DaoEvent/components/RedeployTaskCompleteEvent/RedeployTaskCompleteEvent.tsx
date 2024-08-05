type TRedeployTaskCompleteEventProps = {
  data: any
}

const RedeployTaskCompleteEvent = (props: TRedeployTaskCompleteEventProps) => {
  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-center gap-6">
        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
          Update system flags
        </div>
        <div className="text-sm">true</div>
      </div>
    </div>
  )
}

export { RedeployTaskCompleteEvent }
