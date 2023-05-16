import { getIdenticonAvatar } from '../../../helpers'

type TLineNumberProps = {
    num: number
    threads: any[]
    threadIconProps: React.HTMLAttributes<HTMLDivElement>
    lineNumberProps: React.ButtonHTMLAttributes<HTMLButtonElement>
}

const getThreadAvatar = (seed: string) => {
    return `url('${getIdenticonAvatar({ seed, radius: 20 }).toDataUriSync()}')`
}

const LineNumber = (props: TLineNumberProps) => {
    const { num, threads, threadIconProps, lineNumberProps } = props

    return (
        <td className="p-0 w-14">
            <div className="flex flex-nowrap items-center">
                <div>
                    {threads.map((thread, i) => (
                        <div
                            key={i}
                            data-id={thread.id}
                            className="rounded-full w-4 h-4 bg-contain bg-center bg-no-repeat
                                cursor-pointer mx-2 bg-gray-fafafd
                                hover:scale-125 transition-transform"
                            style={{
                                backgroundImage: getThreadAvatar(
                                    thread.comments[0].username,
                                ),
                            }}
                            {...threadIconProps}
                        ></div>
                    ))}
                </div>
                <div className="grow text-end">
                    <button
                        data-pseudo-content={num}
                        className="w-full text-xs font-mono text-end cursor-pointer text-black/20 hover:text-black"
                        {...lineNumberProps}
                    />
                </div>
            </div>
        </td>
    )
}

export default LineNumber
