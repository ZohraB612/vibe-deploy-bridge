import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export interface ValidationRule {
  validate: (value: string) => boolean | string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  message: string;
  isChecking?: boolean;
}

interface FormValidationProps {
  value: string;
  rules: ValidationRule[];
  onValidationChange?: (result: ValidationResult) => void;
  className?: string;
  showIcon?: boolean;
  debounceMs?: number;
}

export function FormValidation({
  value,
  rules,
  onValidationChange,
  className,
  showIcon = true,
  debounceMs = 300
}: FormValidationProps) {
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: true,
    message: ''
  });
  const [isChecking, setIsChecking] = useState(false);

  const validateField = useCallback(async (inputValue: string): Promise<ValidationResult> => {
    if (!inputValue.trim()) {
      return { isValid: true, message: '' };
    }

    setIsChecking(true);

    // Simulate async validation (e.g., API calls)
    await new Promise(resolve => setTimeout(resolve, 100));

    for (const rule of rules) {
      const result = rule.validate(inputValue);
      if (result !== true) {
        setIsChecking(false);
        return { isValid: false, message: typeof result === 'string' ? result : rule.message };
      }
    }

    setIsChecking(false);
    return { isValid: true, message: 'Looks good!' };
  }, [rules]);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (value.trim()) {
        const result = await validateField(value);
        setValidationResult(result);
        onValidationChange?.(result);
      } else {
        setValidationResult({ isValid: true, message: '' });
        onValidationChange?.({ isValid: true, message: '' });
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [value, validateField, onValidationChange, debounceMs]);

  if (!value.trim()) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm transition-all duration-200 ease-in-out",
        validationResult.isValid ? "text-green-600" : "text-red-600",
        className
      )}
    >
      {showIcon && (
        <div className="flex-shrink-0">
          {isChecking ? (
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          ) : validationResult.isValid ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
        </div>
      )}
      
      <span
        className={cn(
          "transition-all duration-200 ease-in-out",
          isChecking ? "opacity-70" : "opacity-100"
        )}
      >
        {validationResult.message}
      </span>
    </div>
  );
}

// Pre-built validation rules
export const commonValidationRules = {
  required: (message = 'This field is required'): ValidationRule => ({
    validate: (value) => value.trim().length > 0 || message,
    message
  }),
  
  minLength: (min: number, message?: string): ValidationRule => ({
    validate: (value) => value.length >= min || (message || `Must be at least ${min} characters`),
    message: message || `Must be at least ${min} characters`
  }),
  
  maxLength: (max: number, message?: string): ValidationRule => ({
    validate: (value) => value.length <= max || (message || `Must be no more than ${max} characters`),
    message: message || `Must be no more than ${max} characters`
  }),
  
  email: (message = 'Please enter a valid email address'): ValidationRule => ({
    validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || message,
    message
  }),
  
  url: (message = 'Please enter a valid URL'): ValidationRule => ({
    validate: (value) => /^https?:\/\/.+/.test(value) || message,
    message
  }),
  
  alphanumeric: (message = 'Only letters and numbers are allowed'): ValidationRule => ({
    validate: (value) => /^[a-zA-Z0-9]+$/.test(value) || message,
    message
  }),
  
  noSpaces: (message = 'Spaces are not allowed'): ValidationRule => ({
    validate: (value) => !/\s/.test(value) || message,
    message
  })
};

// Hook for form validation
export function useFormValidation<T extends Record<string, string>>(
  initialValues: T,
  validationRules: Record<keyof T, ValidationRule[]>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isValidating, setIsValidating] = useState<Partial<Record<keyof T, boolean>>>({});

  const validateField = useCallback(async (field: keyof T, value: string) => {
    if (!validationRules[field]) return { isValid: true, message: '' };

    setIsValidating(prev => ({ ...prev, [field]: true }));

    // Simulate async validation
    await new Promise(resolve => setTimeout(resolve, 100));

    for (const rule of validationRules[field]) {
      const result = rule.validate(value);
      if (result !== true) {
        const errorMessage = typeof result === 'string' ? result : rule.message;
        setErrors(prev => ({ ...prev, [field]: errorMessage }));
        setIsValidating(prev => ({ ...prev, [field]: false }));
        return { isValid: false, message: errorMessage };
      }
    }

    setErrors(prev => ({ ...prev, [field]: '' }));
    setIsValidating(prev => ({ ...prev, [field]: false }));
    return { isValid: true, message: 'Looks good!' };
  }, [validationRules]);

  const setValue = useCallback((field: keyof T, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }));
    validateField(field, value);
  }, [validateField]);

  const validateForm = useCallback(async (): Promise<boolean> => {
    const validationPromises = Object.keys(validationRules).map(async (field) => {
      const fieldKey = field as keyof T;
      const result = await validateField(fieldKey, values[fieldKey]);
      return { field: fieldKey, ...result };
    });

    const results = await Promise.all(validationPromises);
    const hasErrors = results.some(result => !result.isValid);
    
    return !hasErrors;
  }, [values, validationRules, validateField]);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setIsValidating({});
  }, [initialValues]);

  return {
    values,
    errors,
    isValidating,
    setValue,
    validateForm,
    resetForm,
    hasErrors: Object.keys(errors).some(key => errors[key as keyof T])
  };
}
