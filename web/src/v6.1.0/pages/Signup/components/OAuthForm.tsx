import { Button } from '../../../../components/Form'
import { useOauth } from '../../../hooks/oauth.hooks'

const OAuthForm = () => {
    const { oauth, signin } = useOauth()

    const onOAuthSigninClick = async () => {
        signin('github', { redirectTo: `${document.location.origin}/a/signup` })
    }

    return (
        <div className="flex flex-wrap items-center justify-center gap-14">
            <div className="basis-full lg:basis-4/12 text-center lg:text-start">
                <div className="mb-4 text-3xl font-medium">Welcome to Gosh</div>
                <div className="text-gray-53596d">Please authorize</div>
            </div>

            <div className="basis-full md:basis-8/12 lg:basis-5/12 xl:basis-4/12">
                <div className="border border-gray-e6edff rounded-xl p-8">
                    <h2 className="text-lg text-center mb-6">Sign in with</h2>

                    <div>
                        <Button
                            type="button"
                            size="xl"
                            className="w-full"
                            disabled={oauth.isLoading || !!oauth.session}
                            isLoading={oauth.isLoading || !!oauth.session}
                            onClick={onOAuthSigninClick}
                        >
                            Sign in with GitHub
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export { OAuthForm }
