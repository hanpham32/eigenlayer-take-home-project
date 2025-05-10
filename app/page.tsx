"use client";
import React, { useState } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { FileUpload } from "@/components/file-upload";
import NetworkGraph from "@/components/network-graph";

// After multi-file analysis, each item has a list of source file indices
// Combined analysis result; entities include definitions & contexts
type AnalysisResult = {
  topics: { name: string; files: number[] }[];
  entities: {
    name: string;
    type: string;
    definition: string;
    contexts: { sentence: string; section?: string }[];
    files: number[];
  }[];
  relationships: { source: string; target: string; type: string; files: number[] }[];
};

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState<string>('openai/o4-mini');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [filter, setFilter] = useState<'all'|'uniqueA'|'uniqueB'|'shared'|'security'>('all');
  // Selected entity for details panel
  const [selectedEntity, setSelectedEntity] = useState<{
    id: string;
    name: string;
    type: string;
    definition: string;
    contexts: { sentence: string; section?: string }[];
  } | null>(null);
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
      // Append all selected files
      files.forEach(file => formData.append("file", file));
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
        multiple={true}
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

      {/* Filter controls */}
      {analysis && (
        <div className="mt-4 flex space-x-2">
          <label className="text-sm font-medium">Filter:</label>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as any)}
            className="rounded border px-2 py-1 text-sm"
          >
            <option value="all">All</option>
            <option value="uniqueA">Unique to Paper A</option>
            <option value="uniqueB">Unique to Paper B</option>
            <option value="shared">Only Shared</option>
            <option value="security">Security Concepts</option>
          </select>
        </div>
      )}

      {analysis && (() => {
        // Apply filter
        let ents = analysis.entities;
        let rels = analysis.relationships;
        if (filter === 'uniqueA') {
          ents = ents.filter(e => e.files.length === 1 && e.files[0] === 0);
          rels = rels.filter(r => r.files.length === 1 && r.files[0] === 0);
        } else if (filter === 'uniqueB') {
          ents = ents.filter(e => e.files.length === 1 && e.files[0] === 1);
          rels = rels.filter(r => r.files.length === 1 && r.files[0] === 1);
        } else if (filter === 'shared') {
          ents = ents.filter(e => e.files.length > 1);
          rels = rels.filter(r => r.files.length > 1);
        } else if (filter === 'security') {
          const secNames = ents
            .filter(e => e.name.toLowerCase().includes('security') || e.type.toLowerCase().includes('security'))
            .map(e => e.name);
          ents = ents.filter(e => secNames.includes(e.name));
          rels = rels.filter(r => secNames.includes(r.source) || secNames.includes(r.target));
        }
        const view = { entities: ents, relationships: rels } as any;
        return <NetworkGraph jsonData={view} onEntityClick={setSelectedEntity} />;
      })()}
      {/* Entity details panel */}
      {selectedEntity && (
        <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-xl p-4 overflow-auto z-50">
          <button
            className="mb-4 text-gray-500 hover:text-gray-800"
            onClick={() => setSelectedEntity(null)}
          > Close</button>
          <h2 className="text-xl font-semibold mb-2">{selectedEntity.name}</h2>
          <p className="text-sm text-gray-700 italic mb-4">{selectedEntity.type}</p>
          <h3 className="font-medium">Definition</h3>
          <p className="mb-4 text-gray-800">{selectedEntity.definition}</p>
          <h3 className="font-medium">Contexts</h3>
          {Array.isArray(selectedEntity.contexts) && selectedEntity.contexts.length > 0 ? (
            <ul className="list-disc list-inside space-y-2">
              {selectedEntity.contexts.map((c, i) => (
                <li key={i} className="text-sm">
                  {c.section && <span className="font-semibold">[{c.section}] </span>}
                  {c.sentence}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No context sentences available.</p>
          )}
        </div>
      )}
    </div>
  );
}
