import classNames from 'classnames'

type TListEmptyProps = React.HTMLAttributes<HTMLDivElement>

const ListEmpty = (props: TListEmptyProps) => {
  const { children, className } = props

  return (
    <div
      className={classNames(
        'text-center text-gray-53596d w-full lg:w-1/2 mx-auto mt-28',
        className,
      )}
    >
      <p className="text-xl">Nothing to show</p>
      <p className="leading-tight mt-2">{children}</p>
    </div>
  )
}

export default ListEmpty
