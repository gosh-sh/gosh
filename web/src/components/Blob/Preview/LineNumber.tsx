import { getIdenticonAvatar } from '../../../helpers'

type TLineNumberProps = {
    num: number
    threads: any[]
    threadIconProps: React.HTMLAttributes<HTMLImageElement>
    lineNumberProps: React.ButtonHTMLAttributes<HTMLButtonElement>
    commentsOn?: boolean
}

const getThreadAvatar = (seed: string) => {
    return getIdenticonAvatar({ seed, radius: 20 }).toDataUriSync()
}

const LineNumber = (props: TLineNumberProps) => {
    const { num, threads, threadIconProps, lineNumberProps, commentsOn } = props

    return (
        <td className="p-0 w-14">
            <div className="flex flex-nowrap items-center">
                {commentsOn && (
                    <div className="flex flex-nowrap items-center justify-start">
                        {threads.map((thread, i) => (
                            <div
                                key={i}
                                className="rounded-full w-4 h-4 bg-contain bg-center bg-no-repeat
                                cursor-pointer bg-gray-fafafd overflow-hidden
                                hover:scale-125 transition-transform"
                            >
                                <img
                                    data-id={thread.id}
                                    src={getThreadAvatar(thread.content.username)}
                                    className="w-full"
                                    {...threadIconProps}
                                />
                            </div>
                        ))}
                    </div>
                )}
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
