import { faTimes } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import githubgosh from '../../../../assets/images/githubgosh.svg'
import { useEffect } from 'react'
import { Button } from '../../../../components/Form'
import { useOnboardingData } from '../../../hooks/onboarding.hooks'
import { useUser } from '../../../hooks/user.hooks'

const OnboardingComplete = () => {
    const { user } = useUser()
    const {
        data: { emailOther },
        updateData,
        resetData,
    } = useOnboardingData()

    useEffect(() => {
        updateData({ redirectTo: undefined })
    }, [])

    return (
        <div className="relative border rounded-xl items-center py-9 px-4 lg:px-16 mb-9">
            <Button
                type="button"
                variant="custom"
                className="absolute right-4 top-3 p-1 text-gray-7c8db5 hover:text-black"
                onClick={resetData}
            >
                <FontAwesomeIcon icon={faTimes} size="lg" />
            </Button>

            <div className="flex flex-nowrap items-center justify-between overflow-hidden gap-x-14">
                <div className="grow">
                    <div className="mb-4 text-2xl md:text-3xl font-semibold leading-tight">
                        Welcome to GOSH, <br />
                        {user.username}
                    </div>

                    <p className="text-gray-53596d">
                        When the repositories are uploaded we will send a notification to
                        <span className="text-blue-2b89ff"> {emailOther}</span>
                    </p>
                </div>
                <div className="hidden lg:block">
                    <img src={githubgosh} alt="" />
                </div>
            </div>
        </div>
    )
}

export { OnboardingComplete }
