import { faGithub, faGoogle } from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Provider } from '@supabase/supabase-js'
import { Button } from '../../../../components/Form'
import { useOauth } from '../../../hooks/oauth.hooks'

const OAuthForm = () => {
    const { oauth, signin } = useOauth()

    const onOAuthSigninClick = async (provider: Provider) => {
        signin(provider, { redirectTo: `${document.location.origin}/a/signup` })
    }

    return (
        <div className="flex flex-wrap items-center justify-center gap-14">
            <div className="basis-full md:basis-6/12 lg:basis-4/12 text-center lg:text-start">
                <div className="mb-4 text-3xl font-medium">Welcome to Gosh</div>
                <div className="text-gray-53596d">Please authorize</div>
            </div>

            <div className="basis-full md:basis-6/12 lg:basis-5/12 xl:basis-4/12">
                <div className="border border-gray-e6edff rounded-xl p-8">
                    <h2 className="text-lg text-center mb-6">Sign in with</h2>

                    <div className="flex flex-col gap-y-4">
                        <Button
                            type="button"
                            size="xl"
                            variant="outline-secondary"
                            className="w-full"
                            disabled={oauth.isLoading || !!oauth.session}
                            isLoading={oauth.isLoading || !!oauth.session}
                            onClick={() => onOAuthSigninClick('github')}
                        >
                            <FontAwesomeIcon
                                icon={faGithub}
                                fixedWidth
                                size="lg"
                                className="mr-2"
                            />
                            Sign in with GitHub
                        </Button>
                        <Button
                            type="button"
                            size="xl"
                            variant="outline-secondary"
                            className="w-full"
                            disabled={oauth.isLoading || !!oauth.session}
                            isLoading={oauth.isLoading || !!oauth.session}
                            onClick={() => onOAuthSigninClick('google')}
                        >
                            <FontAwesomeIcon
                                icon={faGoogle}
                                fixedWidth
                                size="lg"
                                className="mr-2"
                            />
                            Sign in with Google
                        </Button>
                        {/* <Button
                            type="button"
                            size="xl"
                            className="w-full"
                            disabled={oauth.isLoading || !!oauth.session}
                            isLoading={oauth.isLoading || !!oauth.session}
                            onClick={() => onOAuthSigninClick('linkedin_oidc')}
                        >
                            Sign in with LinkedIn
                        </Button> */}
                    </div>
                </div>
            </div>
        </div>
    )
}

export { OAuthForm }
