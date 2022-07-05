import { Link } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { userStatePersistAtom } from '../../store/user.state';

const HomePage = () => {
    const userStatePersist = useRecoilValue(userStatePersistAtom);

    return (
        <div className="container pt-16">
            <div className="text-center">
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
                    Git Open Source Hodler
                </h1>
                <div className="text-base mt-10 sm:text-lg sm:max-w-2xl sm:mx-auto md:text-xl text-left">
                    <p>
                        GOSH secures delivery and decentralization of your code.
                    </p>
                    <p className="mt-6">
                        The first development platform blockchain, purpose-built
                        for securing the software supply chain and extracting
                        the value locked in your projects.
                    </p>
                </div>
                <div className="my-10 flex flex-wrap justify-center gap-x-8 gap-y-4">
                    {userStatePersist.phrase ? (
                        <Link
                            to="/account/orgs"
                            className="btn btn--body py-3 px-10 text-xl leading-normal w-full sm:w-auto"
                        >
                            Organizations
                        </Link>
                    ) : (
                        <>
                            <Link
                                to="/account/signin"
                                className="btn btn--body py-3 px-10 text-xl leading-normal w-full sm:w-auto"
                            >
                                Sign in
                            </Link>
                            <Link
                                to="/account/signup"
                                className="btn btn--body py-3 px-10 text-xl leading-normal w-full sm:w-auto"
                            >
                                Create account
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HomePage;
