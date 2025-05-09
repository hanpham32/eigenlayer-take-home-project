"use client";
import React from "react";

/**
 * LoadingSpinner component displays a spinning loader icon.
 */
export const LoadingSpinner: React.FC = () => (
  <div className="w-8 h-8 border-4 border-t-blue-600 border-gray-200 rounded-full animate-spin mb-4" />
);