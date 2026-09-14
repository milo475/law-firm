// Figma: Design System / Select (7:28) — State: Default / Open / Disabled (Radix Select)
'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDownIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { Field } from './field';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  label?: string;
  helper?: string;
  error?: string;
  placeholder?: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  className?: string;
  wrapperClassName?: string;
}

export function Select({
  label, helper, error, placeholder = 'Сонгоно уу', options, value, defaultValue, onValueChange,
  disabled, required, name, className, wrapperClassName,
}: SelectProps) {
  return (
    <Field label={label} helper={helper} error={error} disabled={disabled} required={required} className={wrapperClassName}>
      {({ id, describedBy, invalid }) => (
        <SelectPrimitive.Root value={value} defaultValue={defaultValue} onValueChange={onValueChange} disabled={disabled} name={name} required={required}>
          <SelectPrimitive.Trigger
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={cn(
              'flex h-12 w-full items-center justify-between gap-3 rounded-md border border-border-default bg-bg-surface px-4 text-body text-text-primary outline-none transition-[border-color,box-shadow]',
              'data-[placeholder]:text-text-muted',
              'data-[state=open]:border-2 data-[state=open]:border-border-focus data-[state=open]:px-[15px]',
              'focus-visible:border-2 focus-visible:border-border-focus focus-visible:shadow-focus-ring focus-visible:px-[15px]',
              'disabled:bg-bg-surface-alt disabled:text-text-disabled disabled:cursor-not-allowed',
              invalid && 'border-[1.5px] border-status-danger-solid',
              className,
            )}
          >
            <SelectPrimitive.Value placeholder={placeholder} />
            <SelectPrimitive.Icon className={cn('shrink-0', disabled ? 'text-text-disabled' : 'text-text-secondary')}>
              <ChevronDownIcon size={10} />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>
          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              position="popper"
              sideOffset={8}
              className="z-50 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-border-default bg-bg-surface py-2 shadow-menu"
            >
              <SelectPrimitive.Viewport>
                {options.map((option) => (
                  <SelectPrimitive.Item
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className="flex h-11 cursor-pointer select-none items-center px-4 text-body text-text-primary outline-none data-[highlighted]:bg-bg-brand-soft data-[state=checked]:bg-bg-brand-soft data-[disabled]:text-text-disabled"
                  >
                    <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
      )}
    </Field>
  );
}
