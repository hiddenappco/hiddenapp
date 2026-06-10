import React, { createContext, useContext } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/** Set in Layout so nested PageTransition does not double-animate */
export const AnimatedLayoutContext = createContext(false);

interface PageTransitionProps {
    children: React.ReactNode;
}

/**
 * Lightweight fade for public routes. Routes inside Layout use AnimatedLayoutOutlet instead.
 */
export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
    const insideAnimatedLayout = useContext(AnimatedLayoutContext);
    const reduceMotion = useReducedMotion();

    if (insideAnimatedLayout || reduceMotion) {
        return <div className="w-full h-full min-h-0 flex flex-col">{children}</div>;
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className="w-full h-full min-h-0 flex flex-col overflow-hidden"
            style={{ willChange: 'opacity' }}
        >
            {children}
        </motion.div>
    );
};
