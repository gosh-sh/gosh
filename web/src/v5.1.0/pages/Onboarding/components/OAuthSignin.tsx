import { Button } from '../../../../components/Form'

type TOAuthSigninProps = {
  signinOAuth(): Promise<void>
}

const OAuthSignin = (props: TOAuthSigninProps) => {
  const { signinOAuth } = props

  return (
    <div className="w-full lg:w-1/2">
      <div className="py-24">
        <h1 className="text-5xl font-semibold">
          Git Open
          <br />
          Source Hodler
        </h1>

        <div className="mt-4 text-lg text-gray-53596d">
          <p>GOSH secures delivery and decentralization of your code.</p>
          <p>
            The first development platform blockchain, purpose-built for securing the
            software supply chain and extracting the value locked in your projects.
          </p>
        </div>

        <div className="mt-14">
          <Button type="button" size="xl" onClick={signinOAuth}>
            Create account with Github
          </Button>
        </div>
      </div>
    </div>
  )
}

export default OAuthSignin
