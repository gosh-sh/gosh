type TOAuthSigninProps = {
    signinOAuth(): Promise<void>
}

const OAuthSignin = (props: TOAuthSigninProps) => {
    const { signinOAuth } = props

    return (
        <div className="signup signup--home">
            <div className="signup__aside aside-home">
                <h1 className="aside-home__header">
                    Git Open
                    <br />
                    Source Hodler
                </h1>

                <div className="aside-home__content">
                    <p>GOSH secures delivery and decentralization of your code.</p>
                    <p>
                        The first development platform blockchain, purpose-built for
                        securing the software supply chain and extracting the value locked
                        in your projects.
                    </p>
                </div>

                <button
                    type="button"
                    className="aside-home__signup"
                    onClick={signinOAuth}
                >
                    Create account with Github
                </button>
            </div>
        </div>
    )
}

export default OAuthSignin
