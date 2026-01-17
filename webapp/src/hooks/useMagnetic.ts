import { useRef, useState } from 'react';
import { useMotionValue, useSpring } from 'framer-motion';

/**
 * useMagnetic Hook
 * Provides physics-based magnetic values for x and y coordinates relative to an element.
 * 
 * @param stiffness Spring stiffness (default: 150)
 * @param damping Spring damping (default: 15)
 * @param strength Strength of the magnetic pull (default: 0.2)
 */
export function useMagnetic(stiffness = 150, damping = 15, strength = 0.2) {
    const ref = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    // Raw mouse position values
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Smooth spring physics for the magnetic effect
    const springConfig = { stiffness, damping, mass: 0.1 };
    const springX = useSpring(x, springConfig);
    const springY = useSpring(y, springConfig);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;

        const { clientX, clientY } = e;
        const { left, top, width, height } = ref.current.getBoundingClientRect();

        const centerX = left + width / 2;
        const centerY = top + height / 2;

        // Calculate distance from center * strength
        const limit = 20; // Max pixels to move
        const moveX = Math.max(Math.min((clientX - centerX) * strength, limit), -limit);
        const moveY = Math.max(Math.min((clientY - centerY) * strength, limit), -limit);

        x.set(moveX);
        y.set(moveY);
    };

    const handleMouseEnter = () => {
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        x.set(0);
        y.set(0);
    };

    return {
        ref,
        x: springX,
        y: springY,
        isHovered,
        handleMouseMove,
        handleMouseEnter,
        handleMouseLeave
    };
}
