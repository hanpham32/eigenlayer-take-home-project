'use client';
import React, { useRef, useState, DragEvent, ChangeEvent } from 'react';

interface FileUploadProps {
  /** Allow multiple file selection */
  multiple?: boolean;
  /** Accept attribute for input */
  accept?: string;
  /** Callback when files are selected */
  onFilesSelected?: (files: File[]) => void;
  /** Callback when a file in the list is clicked */
  onFileClick?: (file: File) => void;
}

/**
 * FileUpload component allows users to drag & drop or click to select files.
 * Displays a list of selected files.
 */
export const FileUpload: React.FC<FileUploadProps> = ({
  multiple = false,
  accept,
  onFilesSelected,
  onFileClick = () => {},
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const selected = Array.from(fileList);
    setFiles(selected);
    onFilesSelected?.(selected);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div>
      <div
        className="group flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-md p-6 cursor-pointer hover:border-gray-400 transition-colors"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
      >
        <p className="text-gray-500 group-hover:text-gray-700 transition-colors">
          {files.length > 0 ? 'Change files' : 'Drag files here or click to upload'}
        </p>
        <input
          type="file"
          ref={fileInputRef}
          className="sr-only"
          multiple={multiple}
          accept={accept}
          onChange={handleChange}
        />
      </div>
      {files.length > 0 && (
        <ul className="mt-4 space-y-2">
          {files.map((file, index) => (
            <li
              key={index}
              className="flex justify-between items-center bg-gray-50 p-2 rounded-md cursor-pointer hover:bg-gray-100"
              onClick={() => onFileClick(file)}
            >
              <span className="text-sm text-gray-700 underline">{file.name}</span>
              <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
