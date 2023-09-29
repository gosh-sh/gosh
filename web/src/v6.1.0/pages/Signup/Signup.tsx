import { AnimatePresence, motion } from 'framer-motion'
import { Navigate } from 'react-router-dom'
import { useUser, useUserSignup } from '../../hooks/user.hooks'
import {
    CompleteForm,
    DaoInvitesForm,
    PhraseCheckForm,
    PhraseCreateForm,
    UsernameForm,
} from './components'
import { withRouteAnimation } from '../../hocs'

const motionProps = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.25 },
}

const SignupPage = () => {
    const { persist } = useUser()
    const { data } = useUserSignup()

    if (persist.pin && data.step !== 'complete') {
        return <Navigate to="/a/orgs" />
    }

    return (
        <div className="container pt-20 pb-8">
            <AnimatePresence mode="wait">
                {data.step === 'username' && (
                    <motion.div key="username" {...motionProps}>
                        <UsernameForm />
                    </motion.div>
                )}
                {data.step === 'daoinvite' && (
                    <motion.div key="daoinvite" {...motionProps}>
                        <DaoInvitesForm />
                    </motion.div>
                )}
                {data.step === 'phrase' && (
                    <motion.div key="phrase" {...motionProps}>
                        <PhraseCreateForm />
                    </motion.div>
                )}
                {data.step === 'phrasecheck' && (
                    <motion.div key="phrasecheck" {...motionProps}>
                        <PhraseCheckForm />
                    </motion.div>
                )}
                {data.step === 'complete' && (
                    <motion.div key="complete" {...motionProps}>
                        <CompleteForm />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default withRouteAnimation(SignupPage)
