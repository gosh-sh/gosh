import classNames from 'classnames'

type TListEmptyProps = React.HTMLAttributes<HTMLDivElement>

const ListEmpty = (props: TListEmptyProps) => {
    const { children, className } = props

    return (
        <div className={classNames('signup__norepos', className)}>
            <p className="signup__norepos-title">Nothing to show</p>
            <p className="signup__norepos-content">{children}</p>
        </div>
    )
}

export default ListEmpty
