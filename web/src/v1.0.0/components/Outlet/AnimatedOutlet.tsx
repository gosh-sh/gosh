import { ForwardRefComponent, HTMLMotionProps, motion } from 'framer-motion'
import { Outlet, OutletProps, useLocation } from 'react-router-dom'

type TAnimatedOutletProps = {
    motionProps?: ForwardRefComponent<HTMLDivElement, HTMLMotionProps<'div'>>
    outletProps?: OutletProps
}

const AnimatedOutlet = (props: TAnimatedOutletProps) => {
    const { motionProps, outletProps } = props
    const location = useLocation()

    return (
        <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            {...motionProps}
        >
            <Outlet {...outletProps} />
        </motion.div>
    )
}

export { AnimatedOutlet }
