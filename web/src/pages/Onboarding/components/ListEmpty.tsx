type TListEmptyProps = {
    children?: React.ReactNode
}

const ListEmpty = (props: TListEmptyProps) => {
    const { children } = props

    return (
        <div className="signup__norepos">
            <p className="signup__norepos-title">Nothing to show</p>
            <p className="signup__norepos-content">{children}</p>
        </div>
    )
}

export default ListEmpty
