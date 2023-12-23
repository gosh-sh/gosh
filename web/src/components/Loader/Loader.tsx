import classNames from 'classnames'
import Spinner from '../Spinner'

type TLoaderProps = React.PropsWithChildren & {
  className?: string
}

const Loader = (props: TLoaderProps) => {
  const { className, children } = props
  return (
    <div className={classNames('text-gray-7c8db5', className)}>
      <Spinner className="mr-3" />
      {children}
    </div>
  )
}

export default Loader
