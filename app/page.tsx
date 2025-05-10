"use client";
import React, { useState } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { FileUpload } from "@/components/file-upload";
import NetworkGraph from "@/components/network-graph";

type AnalysisResult = {
  topics: string[];
  entities: { name: string; type: string }[];
  relationships: { source: string; target: string; type: string }[];
  sections: { title: string; start: number; end: number }[];
  citations: { text: string; reference?: string }[];
};

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState<string>('openai/o4-mini');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = (selected: File[]) => {
    setFiles(selected);
    setAnalysis(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const formData = new FormData();
      formData.append("file", files[0]);
      formData.append("model", model);
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload.error || "Analysis failed");
      } else {
        setAnalysis(payload as AnalysisResult);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-3xl font-semibold mb-4">Whitepaper Visualizer</h1>
      <div className="w-full max-w-xs mb-4">
        <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
          Select AI Model
        </label>
        <select
          id="model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm focus:border-blue-600 focus:ring-blue-600 focus:outline-none"
        >
          <option value="openai/o4-mini">openai/o4-mini</option>
          <option value="openai/o3">openai/o3</option>
          <option value="google/gemini-2.5-pro-preview">google/gemini-2.5-pro-preview</option>
          <option value="google/gemini-2.5-flash-preview">google/gemini-2.5-flash-preview</option>
        </select>
      </div>
      {loading && <LoadingSpinner />}
      <FileUpload
        multiple={false}
        accept=".pdf,.txt"
        onFilesSelected={handleFilesSelected}
      />
      <button
        onClick={handleAnalyze}
        disabled={files.length === 0 || loading}
        className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50
    transition"
      >
        {loading ? "Analyzing..." : "Analyze Document"}
      </button>

      {error && <p className="mt-2 text-red-500">{error}</p>}

      {analysis && (
        <NetworkGraph jsonData={analysis} />
      )}
    </div>
  );
}
