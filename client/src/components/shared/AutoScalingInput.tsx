import React, { useState, useEffect } from 'react';

interface AutoScalingInputProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  onCancel?: () => void;
  minWidth?: number;
  charWidth?: number;
  className?: string;
  placeholder?: string;
  type?: 'text' | 'number';
  autoFocus?: boolean;
  textAlign?: 'left' | 'right' | 'center';
}

const AutoScalingInput: React.FC<AutoScalingInputProps> = ({
  value,
  onChange,
  onSave,
  onCancel,
  minWidth = 80,
  charWidth = 8,
  className = '',
  placeholder = '',
  type = 'text',
  autoFocus = true,
  textAlign = 'left',
}) => {
  const [inputValue, setInputValue] = useState(value);

  // Update local state when prop value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Calculate width based on content length
  const calculateWidth = (): string => {
    const contentWidth = Math.max(inputValue.length * charWidth, minWidth);
    return `${contentWidth}px`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    onChange(e.target.value);
  };

  const handleBlur = () => {
    if (onSave) {
      onSave();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onSave) {
      onSave();
    } else if (e.key === 'Escape' && onCancel) {
      onCancel();
    }
  };

  // Combine default styles with custom className
  const inputStyles: React.CSSProperties = {
    width: calculateWidth(),
    textAlign: textAlign,
  };

  const baseClassName = `border-b border-gray-300 focus:outline-none focus:border-dark1 min-w-[${minWidth}px]`;

  return (
    <input
      type={type}
      value={inputValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      style={inputStyles}
      className={`${baseClassName} ${className}`}
      placeholder={placeholder}
      autoFocus={autoFocus}
    />
  );
};

export default AutoScalingInput; 