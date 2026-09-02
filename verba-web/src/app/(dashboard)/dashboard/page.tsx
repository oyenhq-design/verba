"use client";

import { useState, useRef } from "react";
import { UploadCloud, MoreVertical, FileText, Loader2, AlertCircle } from "lucide-react";

type DashboardDocument = {
  id: string;
  name: string;
  words: number;
  quality: number;
  status: string;
  updated: string;
};

export default function DashboardPage() {
  const [documents, setDocuments] = useState<DashboardDocument[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateAndUpload = (file: File) => {
    setError(null);
    
    // Check file size (25MB)
    if (file.size > 25 * 1024 * 1024) {
      setError("This file is larger than the current 25 MB limit.");
      return;
    }

    // Check file type
    const isDocx = file.name.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (!isDocx) {
      setError("Only .docx files are supported.");
      return;
    }

    // Mock Upload Process
    setIsUploading(true);
    setTimeout(() => {
      const newDoc = {
        id: Math.random().toString(36).substring(7),
        name: file.name,
        words: Math.floor(Math.random() * 5000) + 500,
        quality: Math.floor(Math.random() * 40) + 50, // 50-90
        status: "Ready",
        updated: new Date().toLocaleDateString(),
      };
      setDocuments(prev => [newDoc, ...prev]);
      setIsUploading(false);
    }, 2000);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndUpload(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Your documents</h1>
      </header>

      {/* Error Message */}
      {error && (
        <div className="bg-status-error/10 border border-status-error/20 text-status-error px-4 py-3 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Upload Panel */}
      <section 
        className={`relative border-2 border-dashed rounded-xl p-12 text-center flex flex-col items-center justify-center transition-colors cursor-pointer
          ${isDragging ? "border-accent bg-accent/5" : "border-border bg-surface-secondary/50 hover:bg-surface-secondary"}
          ${isUploading ? "pointer-events-none opacity-50" : ""}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
          className="hidden" 
        />
        
        {isUploading ? (
          <>
            <div className="w-16 h-16 bg-background rounded-full border border-border flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
            </div>
            <h3 className="text-lg font-medium mb-1">Processing document...</h3>
            <p className="text-sm text-foreground-secondary mb-6">Reading structure and analyzing writing</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-background rounded-full border border-border flex items-center justify-center mb-4">
              <UploadCloud className="w-8 h-8 text-foreground-secondary" />
            </div>
            <h3 className="text-lg font-medium mb-1">Drop a Word document here</h3>
            <p className="text-sm text-foreground-secondary mb-6">DOCX up to 25 MB</p>
            <button className="bg-surface border border-border text-foreground px-4 py-2 rounded-md hover:bg-surface-secondary transition-colors text-sm font-medium">
              Browse Files
            </button>
          </>
        )}
      </section>

      {/* Documents List */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Recent Documents</h2>
        
        {documents.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-12 text-center space-y-4">
            <h3 className="text-xl font-medium">Your writing workspace is ready.</h3>
            <p className="text-sm text-foreground-secondary max-w-md mx-auto">
              Upload your first document to see where your writing can become clearer, more natural and more consistent.
            </p>
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-surface-secondary text-foreground-muted uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Words</th>
                  <th className="px-6 py-4">Quality</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Updated</th>
                  <th className="px-6 py-4 text-right">Menu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {documents.map(doc => (
                  <tr key={doc.id} className="hover:bg-surface-secondary/50 transition-colors cursor-pointer" onClick={() => window.location.href = `/editor/${doc.id}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-accent" />
                        <span className="font-medium">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-foreground-secondary">{doc.words}</td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-surface border border-border font-medium">
                        <span className={doc.quality > 80 ? "text-status-success" : doc.quality > 60 ? "text-status-warning" : "text-status-error"}>
                          {doc.quality}
                        </span>
                        <span className="text-foreground-muted text-xs">/ 100</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-status-success/10 text-status-success border border-status-success/20">
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-foreground-secondary">{doc.updated}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-foreground-muted hover:text-foreground transition-colors p-1" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
