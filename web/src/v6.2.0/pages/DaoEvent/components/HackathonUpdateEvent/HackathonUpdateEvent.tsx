import moment from 'moment'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'

type THackathonUpdateEventProps = {
    data: any
}

const dt_format = 'MMM D, YYYY HH:mm:ss'

const HackathonUpdateEvent = (props: THackathonUpdateEventProps) => {
    const { data } = props
    console.debug('data', data)

    return (
        <div className="flex flex-col gap-2 py-3">
            <div className="flex items-center gap-6">
                <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                    Hackathon name
                </div>
                <div className="text-sm">{data.name}</div>
            </div>
            {data.metadata.description.brief && (
                <div className="flex flex-wrap items-center gap-x-6">
                    <div className="basis-full text-xs text-gray-53596d">
                        Short description
                    </div>

                    <div className="text-sm">{data.metadata.description.brief}</div>
                </div>
            )}
            {data.metadata.dates && (
                <>
                    <div className="flex items-center gap-6">
                        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                            Start date
                        </div>
                        <div className="text-sm">
                            {data.metadata.dates.start
                                ? moment.unix(data.metadata.dates.start).format(dt_format)
                                : '-'}
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                            Voting date
                        </div>
                        <div className="text-sm">
                            {data.metadata.dates.voting
                                ? moment
                                      .unix(data.metadata.dates.voting)
                                      .format(dt_format)
                                : '-'}
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="basis-5/12 xl:basis-2/12 text-xs text-gray-53596d">
                            Finish date
                        </div>
                        <div className="text-sm">
                            {data.metadata.dates.finish
                                ? moment
                                      .unix(data.metadata.dates.finish)
                                      .format(dt_format)
                                : '-'}
                        </div>
                    </div>
                </>
            )}

            {data.metadata.description.readme && (
                <div className="flex flex-wrap items-center gap-x-6">
                    <div className="basis-full text-xs text-gray-53596d">Readme</div>
                    <div className="markdown-body text-sm">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                            urlTransform={(value: string) => value}
                        >
                            {data.metadata.description.readme}
                        </ReactMarkdown>
                    </div>
                </div>
            )}
            {data.metadata.description.rules && (
                <div className="flex flex-wrap items-center gap-x-6">
                    <div className="basis-full text-xs text-gray-53596d">Rules</div>
                    <div className="markdown-body text-sm">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                            urlTransform={(value: string) => value}
                        >
                            {data.metadata.description.rules}
                        </ReactMarkdown>
                    </div>
                </div>
            )}
            {data.metadata.description.prizes && (
                <div className="flex flex-wrap items-center gap-x-6">
                    <div className="basis-full text-xs text-gray-53596d">Prizes</div>
                    <div className="markdown-body text-sm">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                            urlTransform={(value: string) => value}
                        >
                            {data.metadata.description.prizes}
                        </ReactMarkdown>
                    </div>
                </div>
            )}
        </div>
    )
}

export { HackathonUpdateEvent }
