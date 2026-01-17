import React from 'react';
import { motion } from 'framer-motion';
import { useMagnetic } from '../../hooks/useMagnetic';

interface BentoCardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    subtitle?: string;
    action?: React.ReactNode;
    noPadding?: boolean;
    delay?: number;
    magnetic?: boolean;
}

/**
 * BentoCard: The atomic unit of the Obsidian Dashboard.
 * Now equipped with Kinetic Motion and Magnetic Fields.
 */
export const BentoCard: React.FC<BentoCardProps> = ({
    children,
    className = "",
    title,
    subtitle,
    action,
    noPadding = false,
    delay = 0,
    magnetic = false // Changed default to FALSE based on user feedback (stability > playfulness)
}) => {
    // Magnetic Hook (Only active if explicitly enabled)
    const { ref, x, y, handleMouseMove, handleMouseEnter, handleMouseLeave } = useMagnetic();

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 10 }} // Reduced y-offset for subtler entry
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: delay, ease: "easeOut" }} // Faster duration (0.5s -> 0.3s) for professional feel
            style={{ x: magnetic ? x : 0, y: magnetic ? y : 0 }}
            onMouseMove={magnetic ? handleMouseMove : undefined}
            onMouseEnter={magnetic ? handleMouseEnter : undefined}
            onMouseLeave={magnetic ? handleMouseLeave : undefined}
            className={`
                glass-panel
                relative overflow-hidden
                flex flex-col
                bg-bg-secondary
                transition-colors duration-500
                group
                ${className}
            `}
        >
            {/* Header (Optional) */}
            {(title || action) && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-tertiary/30 backdrop-blur-md">
                    <div>
                        {title && <h3 className="text-sm font-bold text-text-primary tracking-wide uppercase">{title}</h3>}
                        {subtitle && <p className="text-xs text-text-tertiary mt-0.5">{subtitle}</p>}
                    </div>
                    {action && <div>{action}</div>}
                </div>
            )}

            {/* Content */}
            <div className={`flex-1 ${noPadding ? '' : 'p-6'}`}>
                {children}
            </div>

            {/* Kinetic Glow Effect - Moves with the magnetic field implicitly via container */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent-primary/5 blur-3xl -mr-16 -mt-16 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            {/* Mouse Tracking Glow (Optional - could be added later for more polish) */}
            {/* <motion.div style={{ x, y }} className="..." /> */}
        </motion.div>
    );
};
