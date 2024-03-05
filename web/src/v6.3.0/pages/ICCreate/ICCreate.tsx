import { AnimatePresence, motion } from 'framer-motion'
import { useCreateIC } from '../../hooks/ic.hooks'
import { EICCreateStep } from '../../types/ic.types'
import { ApplicationForm, Documents, Repository, Rewards, Roles } from './components'

const motionProps = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.25 },
}

const ICCreatePage = () => {
  const { state } = useCreateIC({ initialize: true })

  return (
    <>
      <h3 className="mb-6 text-xl font-medium">Integrity Credits Flow</h3>
      <div className="border border-gray-e6edff rounded-xl overflow-hidden p-4">
        <AnimatePresence mode="wait">
          {state.step.name === EICCreateStep.ROLES && (
            <motion.div key="roles" {...motionProps}>
              <Roles />
            </motion.div>
          )}
          {state.step.name === EICCreateStep.REWARDS && (
            <motion.div key="rewards" {...motionProps}>
              <Rewards />
            </motion.div>
          )}
          {state.step.name === EICCreateStep.REPOSITORY && (
            <motion.div key="repository" {...motionProps}>
              <Repository />
            </motion.div>
          )}
          {state.step.name === EICCreateStep.DOCUMENTS && (
            <motion.div key="documents" {...motionProps}>
              <Documents />
            </motion.div>
          )}
          {state.step.name === EICCreateStep.FORMS && (
            <motion.div key={`forms-${state.step.params.index}`} {...motionProps}>
              <ApplicationForm index={state.step.params.index} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

export default ICCreatePage
