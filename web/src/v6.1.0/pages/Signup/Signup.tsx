import { AnimatePresence, motion } from 'framer-motion'
import { useUserSignup } from '../../hooks/user.hooks'
import {
    CompleteForm,
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
    const { data } = useUserSignup()

    return (
        <div className="container pt-20 pb-8">
            <AnimatePresence mode="wait">
                {data.step === 'username' && (
                    <motion.div key="username" {...motionProps}>
                        <UsernameForm />
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
