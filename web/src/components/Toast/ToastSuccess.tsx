type TToastSuccessProps = {
  message: { title: string; content?: React.ReactNode } | string
}

const ToastSuccess = (props: TToastSuccessProps) => {
  const { message } = props

  if (typeof message === 'string') {
    return <>{message}</>
  }

  return (
    <>
      <h3 className="font-semibold">{message.title}</h3>
      {message.content && <div className="text-sm">{message.content}</div>}
    </>
  )
}

export { ToastSuccess }
