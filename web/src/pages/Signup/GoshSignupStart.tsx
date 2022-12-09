type TGoshSignupStartProps = {
    signinGithub(): Promise<void>
}

const GoshSignupStart = (props: TGoshSignupStartProps) => {
    const { signinGithub } = props

    return (
        <div className="flex justify-start pt-36">
            <div className="basis-1/2 text-lg">
                <h1 className="pb-4 text-5xl font-semibold leading-tight">
                    Git Open
                    <br />
                    Source Hodler
                </h1>

                <p>GOSH secures delivery and decentralization of your code.</p>
                <p>
                    The first development platform blockchain, purpose-built for securing
                    the software supply chain and extracting the value locked in your
                    projects.
                </p>

                <button
                    type="button"
                    className="btn btn--body mt-14 py-3 px-7 text-base leading-normal font-medium"
                    onClick={signinGithub}
                >
                    Create account with Github
                </button>
            </div>
        </div>
    )
}

export default GoshSignupStart
