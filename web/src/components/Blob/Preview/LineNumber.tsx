type TLineNumberProps = {
  num: number
}

const LineNumber = (props: TLineNumberProps) => {
  const { num } = props

  return (
    <td className="p-0 w-16 align-top">
      <div className="flex flex-nowrap items-center">
        <div className="grow text-end">
          <button
            data-pseudo-content={num}
            className="w-full text-xs font-mono text-end cursor-auto text-black/20"
          />
        </div>
      </div>
    </td>
  )
}

export default LineNumber
