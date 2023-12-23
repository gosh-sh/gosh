import CopyClipboard from '../CopyClipboard'

type TCommiterProps = {
  committer: string
}

const Commiter = (props: TCommiterProps) => {
  const { committer } = props

  const [username, email] = committer.split(' ')
  return (
    <CopyClipboard
      label={username}
      componentProps={{
        text: email,
      }}
    />
  )
}

export { Commiter }
