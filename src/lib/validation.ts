import React from 'react';

// Common validation rules and error messages
export const validationRules = {
  required: (value: any) => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return 'This field is required';
    }
    return true;
  },

  email: (value: string) => {
    if (!value) return true; // Let required rule handle empty values
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return true;
  },

  minLength: (min: number) => (value: string) => {
    if (!value) return true;
    if (value.length < min) {
      return `Must be at least ${min} characters long`;
    }
    return true;
  },

  maxLength: (max: number) => (value: string) => {
    if (!value) return true;
    if (value.length > max) {
      return `Must be no more than ${max} characters long`;
    }
    return true;
  },

  password: (value: string) => {
    if (!value) return true;
    
    const checks = {
      length: value.length >= 8,
      uppercase: /[A-Z]/.test(value),
      lowercase: /[a-z]/.test(value),
      number: /\d/.test(value),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(value)
    };

    const failedChecks = Object.entries(checks)
      .filter(([_, passed]) => !passed)
      .map(([check]) => check);

    if (failedChecks.length > 0) {
      const messages = {
        length: 'at least 8 characters',
        uppercase: 'one uppercase letter',
        lowercase: 'one lowercase letter',
        number: 'one number',
        special: 'one special character'
      };

      const failedMessages = failedChecks.map(check => messages[check as keyof typeof messages]);
      return `Password must contain ${failedMessages.join(', ')}`;
    }

    return true;
  },

  url: (value: string) => {
    if (!value) return true;
    try {
      new URL(value);
      return true;
    } catch {
      return 'Please enter a valid URL';
    }
  },

  domain: (value: string) => {
    if (!value) return true;
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!domainRegex.test(value)) {
      return 'Please enter a valid domain name';
    }
    return true;
  },

  awsRoleArn: (value: string) => {
    if (!value) return true;
    const arnRegex = /^arn:aws:iam::\d{12}:role\/[\w+=,.@-]+$/;
    if (!arnRegex.test(value)) {
      return 'Please enter a valid AWS IAM Role ARN';
    }
    return true;
  },

  fileSize: (maxSizeMB: number) => (files: File[]) => {
    if (!files || files.length === 0) return true;
    
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    
    if (totalSize > maxSizeBytes) {
      return `Total file size must be less than ${maxSizeMB}MB`;
    }
    
    return true;
  },

  fileType: (allowedTypes: string[]) => (files: File[]) => {
    if (!files || files.length === 0) return true;
    
    const invalidFiles = files.filter(file => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      return !extension || !allowedTypes.includes(extension);
    });
    
    if (invalidFiles.length > 0) {
      return `Only ${allowedTypes.join(', ')} files are allowed`;
    }
    
    return true;
  },

  positiveNumber: (value: number) => {
    if (value === undefined || value === null) return true;
    if (value <= 0) {
      return 'Must be a positive number';
    }
    return true;
  },

  range: (min: number, max: number) => (value: number) => {
    if (value === undefined || value === null) return true;
    if (value < min || value > max) {
      return `Must be between ${min} and ${max}`;
    }
    return true;
  }
};

// Validation helper function
export function validateField(value: any, rules: Array<(value: any) => true | string>): string | null {
  for (const rule of rules) {
    const result = rule(value);
    if (result !== true) {
      return result;
    }
  }
  return null;
}

// Common validation schemas
export const validationSchemas = {
  email: [validationRules.required, validationRules.email],
  password: [validationRules.required, validationRules.password],
  domain: [validationRules.required, validationRules.domain],
  awsRoleArn: [validationRules.required, validationRules.awsRoleArn],
  projectName: [
    validationRules.required,
    validationRules.minLength(3),
    validationRules.maxLength(50)
  ],
  description: [
    validationRules.maxLength(500)
  ]
};

// Real-time validation hook
export function useFieldValidation<T extends Record<string, any>>(
  formData: T,
  fieldName: keyof T,
  rules: Array<(value: any) => true | string>
) {
  const [error, setError] = React.useState<string | null>(null);
  const [isValidating, setIsValidating] = React.useState(false);

  React.useEffect(() => {
    const validate = async () => {
      setIsValidating(true);
      const fieldError = validateField(formData[fieldName], rules);
      setError(fieldError);
      setIsValidating(false);
    };

    // Debounce validation
    const timeoutId = setTimeout(validate, 300);
    return () => clearTimeout(timeoutId);
  }, [formData[fieldName], rules]);

  return { error, isValidating, isValid: !error };
}
