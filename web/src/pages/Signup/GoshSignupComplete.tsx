import githubgosh from '../../assets/images/githubgosh.svg'

type TGoshSignupCompleteProps = {
    username: string
    email: string
}

const GoshSignupComplete = (props: TGoshSignupCompleteProps) => {
    const { username, email } = props

    return (
        <div className="flex justify-between items-center pt-56 pb-5">
            <div className="basis-1/2 px-24">
                <div className="text-2xl font-medium">
                    Welcome to GOSH, <br />
                    {username}
                </div>

                <p className="mt-4 text-gray-53596d">
                    When the repositories are uploaded we will send a notification to
                    <span className="text-blue-348eff"> {email}</span>
                </p>
            </div>
            <div className="basis-1/2 px-3">
                <img src={githubgosh} alt="" />
            </div>
        </div>
    )
}

export default GoshSignupComplete
