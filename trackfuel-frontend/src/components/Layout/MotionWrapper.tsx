import { motion, Variants } from 'framer-motion';
import { ReactNode } from 'react';
import { 
  fadeIn, 
  slideInLeft, 
  slideInRight, 
  slideInUp, 
  slideInDown,
  scaleIn,
  staggerItem, 
} from '@/lib/utils/motionVariants';

interface MotionWrapperProps {
  children: ReactNode;
  variant?: 'fade' | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown' | 'scale' | 'stagger';
  className?: string;
  delay?: number;
  custom?: any;
  whileHover?: any;
  whileTap?: any;
  as?: 'div' | 'section' | 'article' | 'li' | 'span';
}

const variantMap: Record<string, Variants> = {
  fade: fadeIn,
  slideLeft: slideInLeft,
  slideRight: slideInRight,
  slideUp: slideInUp,
  slideDown: slideInDown,
  scale: scaleIn,
  stagger: staggerItem
};

export const MotionWrapper = ({ 
  children, 
  variant = 'fade',
  className = '',
  delay = 0,
  custom,
  whileHover,
  whileTap,
  as = 'div'
}: MotionWrapperProps) => {
  const MotionComponent = motion[as];
  
  return (
    <MotionComponent
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variantMap[variant]}
      transition={{
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1] as any,
        delay
      }}
      custom={custom}
      whileHover={whileHover}
      whileTap={whileTap}
      className={className}
    >
      {children}
    </MotionComponent>
  );
};
