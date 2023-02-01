import { TUserSignupProgress } from 'react-gosh'
import { UILog, UILogItem } from '../../../components/UILog'

type TSignupProgressProps = {
    progress: TUserSignupProgress
    className?: string
}

const SignupProgress = (props: TSignupProgressProps) => {
    const { progress, className } = props

    if (!progress.isFetching) return null
    return (
        <UILog className={className}>
            <UILogItem result={progress.isProfileDeployed}>Deploy profile</UILogItem>
        </UILog>
    )
}

export { SignupProgress }
