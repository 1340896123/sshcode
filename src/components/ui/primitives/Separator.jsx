import React, { forwardRef } from 'react';
import { cva } from '../utils/cva';
import { clsx } from '../utils/clsx';

const separatorVariants = cva(
  'border-slate-700',
  {
    variants: {
      orientation: {
        horizontal: 'border-t',
        vertical: 'border-l',
      },
      variant: {
        default: 'border-slate-700',
        muted: 'border-slate-600',
        accent: 'border-slate-500',
      },
    },
    defaultVariants: {
      orientation: 'horizontal',
      variant: 'default',
    },
  }
);

export const Separator = forwardRef((
  { 
    className,
    orientation,
    variant,
    decorative = true,
    ...props 
  }, 
  ref
) => {
  return (
    <div
      ref={ref}
      role={decorative ? 'none' : 'separator'}
      aria-orientation={orientation}
      className={clsx(separatorVariants({ orientation, variant, className }))}
      {...props}
    />
  );
});

Separator.displayName = 'Separator';
