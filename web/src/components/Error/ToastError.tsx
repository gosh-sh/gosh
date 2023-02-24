import { GoshError } from 'react-gosh'
import CopyClipboard from '../CopyClipboard'

type TToastErrorProps = {
    error: any
}

const ToastError = (props: TToastErrorProps) => {
    const { error } = props

    if (error instanceof GoshError) {
        return (
            <>
                <p>{error.title || 'Something went wrong'}</p>
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
            <p>{error.title || 'Internal error'}</p>
            <p className="text-xs">{error.message}</p>
            <CopyClipboard
                label="Copy error message"
                className="mt-3 text-xs"
                componentProps={{
                    text: error.message,
                }}
            />
        </>
    )
}

export default ToastError
