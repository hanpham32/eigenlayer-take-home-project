import React from 'react';

export interface CardProps {
  className?: string;
  children: React.ReactNode;
}
/**
 * Simple card container
 */
export const Card: React.FC<CardProps> = ({ className = '', children }) => (
  <div className={`bg-white shadow rounded-md p-4 ${className}`}>{children}</div>
);