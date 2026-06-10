import React from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AnimatedLayoutContext } from './PageTransition';

interface AnimatedLayoutOutletProps {
    outletContext?: Record<string, unknown>;
}

/**
 * Single fade transition for all authenticated (Layout) screens.
 * Avoids remounting the full Routes tree and duplicate PageTransition work.
 */
export const AnimatedLayoutOutlet: React.FC<AnimatedLayoutOutletProps> = ({ outletContext }) => {
    const location = useLocation();
    const outlet = useOutlet(outletContext);
    const reduceMotion = useReducedMotion();

    if (reduceMotion) {
        return (
            <AnimatedLayoutContext.Provider value={true}>
                <div className="w-full h-full min-h-0">{outlet}</div>
            </AnimatedLayoutContext.Provider>
        );
    }

    return (
        <AnimatedLayoutContext.Provider value={true}>
            <AnimatePresence mode="sync" initial={false}>
                <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full h-full min-h-0 overflow-hidden"
                    style={{ willChange: 'opacity' }}
                >
                    {outlet}
                </motion.div>
            </AnimatePresence>
        </AnimatedLayoutContext.Provider>
    );
};
