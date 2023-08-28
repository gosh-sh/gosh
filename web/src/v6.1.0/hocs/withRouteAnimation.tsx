import { motion } from 'framer-motion'

export const withRouteAnimation = (Component: any) => {
    return (props: any) => {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
            >
                <Component {...props} />
            </motion.div>
        )
    }
}
