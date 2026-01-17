import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';

export interface SelectOption {
    value: string;
    label: string;
    sublabel?: string;
}

export interface CustomSelectProps {
    options: SelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

const menuVariants = {
    hidden: { opacity: 0, y: -10, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -10, scale: 0.95 }
};

const CustomSelect: React.FC<CustomSelectProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Seleccionar...',
    disabled = false,
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reset highlighted index when opening
    useEffect(() => {
        if (isOpen) {
            const currentIndex = options.findIndex(opt => opt.value === value);
            setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
        }
    }, [isOpen, options, value]);

    // Scroll highlighted option into view
    useEffect(() => {
        if (isOpen && listRef.current && highlightedIndex >= 0) {
            const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
            if (highlightedElement) {
                highlightedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex, isOpen]);

    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
        if (disabled) return;

        switch (event.key) {
            case 'Enter':
            case ' ':
                event.preventDefault();
                if (isOpen && highlightedIndex >= 0) {
                    onChange(options[highlightedIndex].value);
                    setIsOpen(false);
                } else {
                    setIsOpen(true);
                }
                break;
            case 'ArrowDown':
                event.preventDefault();
                if (isOpen) {
                    setHighlightedIndex(prev =>
                        prev < options.length - 1 ? prev + 1 : 0
                    );
                } else {
                    setIsOpen(true);
                }
                break;
            case 'ArrowUp':
                event.preventDefault();
                if (isOpen) {
                    setHighlightedIndex(prev =>
                        prev > 0 ? prev - 1 : options.length - 1
                    );
                } else {
                    setIsOpen(true);
                }
                break;
            case 'Escape':
                event.preventDefault();
                setIsOpen(false);
                break;
            case 'Tab':
                setIsOpen(false);
                break;
        }
    }, [disabled, isOpen, highlightedIndex, options, onChange]);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    const toggleOpen = () => {
        if (!disabled) {
            setIsOpen(prev => !prev);
        }
    };

    return (
        <div
            ref={containerRef}
            className={`relative ${className}`}
        >
            {/* Trigger Button */}
            <button
                type="button"
                onClick={toggleOpen}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-labelledby="select-label"
                className={`
                    w-full flex items-center justify-between gap-2
                    px-4 py-3 rounded-xl
                    bg-bg-tertiary border border-white/10
                    text-left text-text-primary
                    transition-all duration-200
                    ${disabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-bg-elevated hover:border-accent-primary/50 cursor-pointer'
                    }
                    ${isOpen ? 'border-accent-primary ring-2 ring-accent-primary/20' : ''}
                    focus:outline-none focus:ring-2 focus:ring-accent-primary/30 focus:border-accent-primary
                `}
            >
                <span className={selectedOption ? 'text-text-primary' : 'text-text-secondary'}>
                    {selectedOption?.label || placeholder}
                </span>
                <ChevronDownIcon
                    className={`w-5 h-5 text-text-secondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.ul
                        ref={listRef}
                        role="listbox"
                        aria-activedescendant={highlightedIndex >= 0 ? `option-${highlightedIndex}` : undefined}
                        variants={menuVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                        className={`
                            absolute z-50 w-full mt-2
                            max-h-64 overflow-y-auto
                            bg-bg-secondary/95 backdrop-blur-xl
                            border border-white/10 rounded-xl
                            shadow-elevated
                            py-1
                        `}
                    >
                        {/* Placeholder option */}
                        <li
                            id="option-placeholder"
                            role="option"
                            aria-selected={!value}
                            onClick={() => handleSelect('')}
                            onMouseEnter={() => setHighlightedIndex(-1)}
                            className={`
                                px-4 py-3 cursor-pointer
                                flex items-center justify-between
                                transition-colors duration-100
                                ${!value ? 'bg-accent-primary/20 text-accent-primary' : 'text-text-secondary'}
                                ${highlightedIndex === -1 ? 'bg-accent-primary/10' : ''}
                                hover:bg-accent-primary/10
                            `}
                        >
                            <span className="italic">{placeholder}</span>
                        </li>

                        {/* Options */}
                        {options.map((option, index) => {
                            const isSelected = option.value === value;
                            const isHighlighted = index === highlightedIndex;

                            return (
                                <li
                                    key={option.value}
                                    id={`option-${index}`}
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => handleSelect(option.value)}
                                    onMouseEnter={() => setHighlightedIndex(index)}
                                    className={`
                                        px-4 py-3 cursor-pointer
                                        flex items-center justify-between
                                        transition-colors duration-100
                                        ${isSelected
                                            ? 'bg-accent-primary text-white font-medium'
                                            : 'text-text-primary'
                                        }
                                        ${isHighlighted && !isSelected ? 'bg-accent-primary/20' : ''}
                                        ${!isSelected ? 'hover:bg-accent-primary/10' : ''}
                                    `}
                                >
                                    <div className="flex flex-col">
                                        <span>{option.label}</span>
                                        {option.sublabel && (
                                            <span className={`text-xs mt-0.5 ${isSelected ? 'text-white/70' : 'text-text-secondary'}`}>
                                                {option.sublabel}
                                            </span>
                                        )}
                                    </div>
                                    {isSelected && (
                                        <CheckIcon className="w-5 h-5 flex-shrink-0" />
                                    )}
                                </li>
                            );
                        })}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CustomSelect;
