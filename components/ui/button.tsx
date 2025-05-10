import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}
export const Button: React.FC<ButtonProps> = ({ className = '', ...props }) => (
  <button
    className={
      `inline-flex items-center justify-center rounded-md px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 ${className}`
    }
    {...props}
  />
);