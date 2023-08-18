type TListEmptyProps = {
    children?: React.ReactNode
}

const ListEmpty = (props: TListEmptyProps) => {
    const { children } = props

    return (
        <div className="text-center text-gray-53596d w-full lg:w-1/2 mx-auto mt-28">
            <p className="text-xl">Nothing to show</p>
            <p className="leading-tight mt-2">{children}</p>
        </div>
    )
}

export default ListEmpty
