import React from "react";
import clsx from "clsx";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  color?: string;
  width?: number;
  height?: number;
  rounded?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const Button: React.FC<ButtonProps> = ({
  children,
  color = "dark1",
  width,
  height,
  rounded = "md",
  className,
  onClick,
  disabled,
  type = "button",
  ...rest
}) => {

  const buttonClasses = clsx(
    // Base styles
    "font-medium transition-all duration-200 ease-in-out focus:outline-none",
    "inline-flex items-center justify-center",
    "px-4 py-2 shadow-md text-sm",

    color && `bg-${color}`,
    width && `w-${width}`,
    height && `h-${height}`,
    rounded && `rounded-${rounded}`,

    // Disabled state
    disabled && "opacity-50 cursor-not-allowed",
    
    // Custom classes
    className
  );

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
};

export default Button; 