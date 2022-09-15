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
                <p>Something went wrong</p>
                <p className="text-sm">{error.message}</p>
            </>
        )
    }

    return (
        <>
            <p>Internal error</p>
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
