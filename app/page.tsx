"use client";
import React, { useState, useEffect } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  // Preview selected uploaded file
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewText, setPreviewText] = useState<string>('');
  // Load text preview when a non-PDF file is selected
  useEffect(() => {
    if (previewFile && previewFile.type !== 'application/pdf') {
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewText(reader.result as string);
      };
      reader.readAsText(previewFile, 'utf-8');
    } else {
      setPreviewText('');
    }
  }, [previewFile]);
  // removed filtering feature
  // Selected entity for details panel
  const [selectedEntity, setSelectedEntity] = useState<{
    id: string;
    name: string;
    type: string;
    definition: string;
    contexts: { sentence: string; section?: string }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Chat state
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'assistant'; text: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState<string>('');

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
        // reset chat
        setChatMessages([]);
        setChatInput('');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-3xl font-semibold mb-4">Whitepaper Interactive Visualizer</h1>
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
        onFileClick={(file) => setPreviewFile(file)}
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
        <NetworkGraph
          jsonData={{ entities: analysis.entities, relationships: analysis.relationships }}
          onEntityClick={setSelectedEntity}
        />
      )}
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

      {/* Preview panel for uploaded document */}
      {previewFile && (
        <div className="mt-6 w-full max-w-4xl border rounded p-4 mx-auto">
          <h2 className="text-lg font-medium mb-2">Preview: {previewFile.name}</h2>
          {previewFile.type === 'application/pdf' ? (
            <iframe
              src={URL.createObjectURL(previewFile)}
              className="w-full h-[80vh]"
              title="PDF Preview"
            />
          ) : (
            <div className="w-full h-[80vh] overflow-auto bg-gray-50 p-2">
              <pre className="whitespace-pre-wrap text-sm">
                {previewText}
              </pre>
            </div>
          )}
          <button
            className="mt-2 text-sm text-blue-600 hover:underline"
            onClick={() => setPreviewFile(null)}
          >Close Preview</button>
        </div>
      )}
      {/* Chatbox for Q&A */}
      {analysis && (
        <div className="mt-6 w-full max-w-2xl">
          <h2 className="text-xl font-semibold mb-2 text-center">Chat about the uploaded documents</h2>
          <Card className="h-64 overflow-auto">
            {chatLoading ? (
              <div className="flex justify-center items-center h-full">
                <LoadingSpinner />
              </div>
            ) : (
              chatMessages.map((m, i) => (
                <div key={i} className={m.sender === 'user' ? 'text-right mb-1' : 'text-left mb-1'}>
                  <span className={
                    m.sender === 'user'
                      ? 'inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded'
                      : 'inline-block bg-gray-100 text-gray-800 px-2 py-1 rounded'
                  }>
                    {m.text}
                  </span>
                </div>
              ))
            )}
          </Card>
          <form
            className="mt-2 flex space-x-2"
            onSubmit={async e => {
              e.preventDefault();
              if (!chatInput.trim()) return;
              setChatMessages(prev => [...prev, { sender: 'user', text: chatInput }]);
              const q = chatInput;
              setChatInput('');
              setChatLoading(true);
              try {
                const res = await fetch('/api/chat', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ question: q, analysis }),
                });
                const data = await res.json();
                const reply = data.answer || data.error || 'No response';
                setChatMessages(prev => [...prev, { sender: 'assistant', text: reply }]);
              } catch (err: any) {
                setChatMessages(prev => [...prev, { sender: 'assistant', text: 'Error: ' + err.message }]);
              } finally {
                setChatLoading(false);
              }
            }}
          >
            <input
              type="text"
              className="flex-1 border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your question..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
            />
            <Button type="submit">Send</Button>
          </form>
        </div>
      )}
    </div>
  );
}
