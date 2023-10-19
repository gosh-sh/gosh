import { GoshError } from '../../errors'
import CopyClipboard from '../CopyClipboard'

type TToastErrorProps = {
    error: any
}

const ToastError = (props: TToastErrorProps) => {
    const { error } = props

    if (error instanceof GoshError) {
        return (
            <>
                <h3 className="font-semibold">{error.title || 'Something went wrong'}</h3>
                {error.data && (
                    <p className="text-sm">
                        {typeof error.data === 'string'
                            ? error.data
                            : JSON.stringify(error.data, undefined, 1)}
                    </p>
                )}
            </>
        )
    }

    return (
        <>
            <h3 className="font-semibold">{error.name || 'Internal error'}</h3>
            <p className="text-sm">{error.message}</p>
            <p className="text-xs">{JSON.stringify(error)}</p>
            <CopyClipboard
                label="Copy error message"
                className="mt-3 text-xs"
                componentProps={{
                    text: JSON.stringify(error),
                }}
            />
        </>
    )
}

export { ToastError }
