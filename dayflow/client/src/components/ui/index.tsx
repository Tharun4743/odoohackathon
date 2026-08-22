import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  ...props
}) => {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]';

  const variants = {
    primary: 'bg-black text-white hover:bg-stone-800 focus:ring-black shadow-xs',
    secondary: 'bg-stone-100 text-stone-800 hover:bg-stone-200 focus:ring-stone-400',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 shadow-xs',
    ghost: 'text-stone-600 hover:bg-stone-100 focus:ring-stone-400',
    outline: 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 hover:border-stone-300 focus:ring-stone-400 shadow-xs',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 shadow-xs',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};

// Input
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  className,
  id,
  ...props
}) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-bold text-stone-700 uppercase tracking-wider">
          {label}
          {props.required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          className={clsx(
            'w-full rounded-xl border px-3.5 py-2 text-sm text-stone-900 placeholder-stone-400 transition-all bg-white',
            'focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent',
            leftIcon ? 'pl-10' : '',
            error ? 'border-rose-300 bg-rose-50/50' : 'border-stone-200 hover:border-stone-300',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
      {helperText && !error && <p className="text-xs text-stone-500">{helperText}</p>}
    </div>
  );
};

// Select
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  placeholder,
  className,
  id,
  ...props
}) => {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-xs font-bold text-stone-700 uppercase tracking-wider">
          {label}
          {props.required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}
      <select
        id={selectId}
        className={clsx(
          'w-full rounded-xl border px-3.5 py-2 text-sm text-stone-900 bg-white transition-all',
          'focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent',
          error ? 'border-rose-300 bg-rose-50/50' : 'border-stone-200 hover:border-stone-300',
          className
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
    </div>
  );
};

// Textarea
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, className, id, ...props }) => {
  const areaId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={areaId} className="text-xs font-bold text-stone-700 uppercase tracking-wider">
          {label}
          {props.required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        id={areaId}
        className={clsx(
          'w-full rounded-xl border px-3.5 py-2 text-sm text-stone-900 placeholder-stone-400 resize-y bg-white transition-all',
          'focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent',
          error ? 'border-rose-300 bg-rose-50/50' : 'border-stone-200 hover:border-stone-300',
          className
        )}
        rows={3}
        {...props}
      />
      {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
    </div>
  );
};

// Badge
type BadgeVariant = 'blue' | 'green' | 'red' | 'yellow' | 'slate' | 'purple' | 'orange';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'blue', children, className }) => {
  const variants: Record<BadgeVariant, string> = {
    blue: 'bg-sky-50 text-sky-700 border-sky-200/80',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    red: 'bg-rose-50 text-rose-700 border-rose-200/80',
    yellow: 'bg-amber-50 text-amber-700 border-amber-200/80',
    slate: 'bg-stone-100 text-stone-700 border-stone-200/80',
    purple: 'bg-purple-50 text-purple-700 border-purple-200/80',
    orange: 'bg-orange-50 text-orange-700 border-orange-200/80',
  };

  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide', variants[variant], className)}>
      {children}
    </span>
  );
};

// Card
interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className, padding = 'md', onClick }) => {
  const paddings = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' };
  return (
    <div className={clsx('bg-white rounded-2xl border border-stone-200/90 shadow-xs', paddings[padding], className)} onClick={onClick}>
      {children}
    </div>
  );
};

// Loader
export const Loader: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({ size = 'md', className }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' };
  return (
    <div className={clsx('flex items-center justify-center', className)}>
      <Loader2 className={clsx(sizes[size], 'animate-spin text-black')} />
    </div>
  );
};

// Skeleton
export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={clsx('skeleton', className)} />
);

// Empty state
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    {icon && <div className="mb-3 text-stone-300">{icon}</div>}
    <h3 className="text-sm font-bold text-stone-800 mb-1">{title}</h3>
    {description && <p className="text-sm text-stone-500 mb-4 max-w-xs">{description}</p>}
    {action}
  </div>
);

// Error state
export const ErrorState: React.FC<{ message?: string; onRetry?: () => void }> = ({
  message = 'Something went wrong.',
  onRetry,
}) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3 font-bold border border-rose-200/60">
      !
    </div>
    <p className="text-sm text-stone-600 mb-3 font-medium">{message}</p>
    {onRetry && (
      <Button variant="outline" size="sm" onClick={onRetry}>Try again</Button>
    )}
  </div>
);
