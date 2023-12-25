import { GoshError } from '../../errors'
import CopyClipboard from '../CopyClipboard'

type TToastErrorProps = {
  error: any
}

const ToastError = (props: TToastErrorProps) => {
  const { error } = props

  if (error instanceof GoshError) {
    let data: string | null = null
    if (error.data) {
      data =
        typeof error.data === 'string'
          ? error.data
          : JSON.stringify(error.data, undefined, 1)
    }

    return (
      <>
        <h3 className="font-semibold">{error.title || 'Something went wrong'}</h3>
        {data && (
          <>
            <p className="text-sm">{data}</p>
            <CopyClipboard
              label="Copy error message"
              className="mt-3 text-xs"
              componentProps={{ text: data }}
            />
          </>
        )}
      </>
    )
  }

  const data = error.data ? JSON.stringify(error, undefined, 1) : null
  return (
    <>
      <h3 className="font-semibold">{error.name || 'Internal error'}</h3>
      <p className="text-sm">{error.message}</p>
      {data && <p className="text-xs">{data}</p>}
      <CopyClipboard
        label="Copy error message"
        className="mt-3 text-xs"
        componentProps={{ text: data || error.message }}
      />
    </>
  )
}

export { ToastError }
