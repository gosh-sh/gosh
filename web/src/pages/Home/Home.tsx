import { useRecoilValue } from 'recoil'
import { ButtonLink } from '../../components/Form'
import { userPersistAtom } from '../../store/user.state'
import { Navigate } from 'react-router-dom'

const HomePage = () => {
    const user = useRecoilValue(userPersistAtom)

    if (user.phrase) {
        return <Navigate to="/a/orgs" />
    }

    return (
        <div className="container pt-20 pb-8">
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
                            The first development platform blockchain, purpose-built for
                            securing the software supply chain and extracting the value
                            locked in your projects.
                        </p>
                    </div>

                    <div className="mt-14">
                        <ButtonLink to="/a/signup" size="xl">
                            Create account
                        </ButtonLink>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default HomePage
