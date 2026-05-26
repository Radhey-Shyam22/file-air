import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Upload, FileUp, Clock, Check, Copy, Trash2, Plus, 
  Loader2, AlertCircle, Share2, CornerDownRight, RefreshCcw, QrCode
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { formatBytes } from "../lib/format";
import { getFileIconComponent } from "../lib/fileIcon";
import { UploadResponse } from "../types";

interface UploadSectionProps {
  onUploadSuccess: () => void;
}

type ExpirationOption = "5" | "15" | "60" | "1440" | "once";

export default function UploadSection({ onUploadSuccess }: UploadSectionProps) {
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<ExpirationOption>("15");
  const [dragActive, setDragActive] = useState(false);
  
  // Progress & States
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      // File size validation (100MB limit matching server)
      if (droppedFile.size > 100 * 1024 * 1024) {
        setError("File size exceeds the 100MB temporary transfer limit.");
        return;
      }
      setFile(droppedFile);
      setError(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 100 * 1024 * 1024) {
        setError("File size exceeds the 100MB temporary transfer limit.");
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Real Upload with progress monitoring
  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("duration", duration);

    // Native AJAX execution to preserve high-fidelity file upload progress updates
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload", true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentCalculated = Math.round((event.loaded / event.total) * 100);
        setProgress(percentCalculated);
      }
    };

    xhr.onload = () => {
      setUploading(false);
      try {
        const resData = JSON.parse(xhr.responseText);
        if (xhr.status === 201 && resData.success) {
          setResult(resData);
          onUploadSuccess(); // Update network status indicators
        } else {
          setError(resData.error || "A problem occurred while uploading your file.");
        }
      } catch (err) {
        setError("Failed to interpret the server response.");
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      setError("Network error occurred during transmission.");
    };

    xhr.send(formData);
  };

  // Delete/Revoke a transfer
  const handleRevoke = async () => {
    if (!result) return;
    setRevoking(true);
    try {
      const response = await fetch(`/api/delete/${result.key}`, {
        method: "POST",
      });
      const data = await response.json();
      if (data.success) {
        // Reset state
        setFile(null);
        setResult(null);
        onUploadSuccess();
      } else {
        setError(data.error || "Unable to cancel file transfer.");
      }
    } catch (err) {
      setError("Communication failure with the host server.");
    } finally {
      setRevoking(false);
    }
  };

  const copyToClipboard = (text: string, isLink: boolean) => {
    navigator.clipboard.writeText(text);
    if (isLink) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const getFullDownloadUrl = (key: string) => {
    return `${window.location.origin}?key=${key}`;
  };

  const resetUploadForm = () => {
    setFile(null);
    setResult(null);
    setProgress(0);
    setError(null);
  };

  return (
    <div className="p-6 md:p-8">
      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div
            key="upload-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
          >
            <form onSubmit={handleUploadSubmit} className="space-y-6">
              
              {/* Drag Drop Area */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={file ? undefined : triggerFileSelect}
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 flex flex-col items-center justify-center cursor-pointer ${
                  dragActive 
                    ? "border-indigo-500 bg-indigo-50/40 scale-[0.99]" 
                    : file 
                      ? "border-slate-300 bg-slate-50/30 cursor-default" 
                      : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {!file ? (
                  <div className="space-y-3 pointer-events-none">
                    <div className="mx-auto w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Upload className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        Drag and drop your file here, or <span className="text-indigo-600 underline cursor-pointer hover:text-indigo-700">browse</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Any standard file format up to 100 MB
                      </p>
                    </div>
                  </div>
                ) : (
                  (() => {
                    const SelectedFileIcon = getFileIconComponent(file.type, file.name);
                    return (
                      <div className="w-full">
                        <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 max-w-lg mx-auto shadow-xs text-left">
                          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                            <SelectedFileIcon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-800 truncate" title={file.name}>
                              {file.name}
                            </p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">
                              {formatBytes(file.size)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFile(null);
                            }}
                            className="p-1 h-7 w-7 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                            title="Deselect"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Expiry Settings Row */}
              {file && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-3 bg-slate-50 border border-slate-100 p-4 rounded-xl"
                >
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Temporary Storage Lifespan
                  </label>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {[
                      { value: "5", label: "5 Min" },
                      { value: "15", label: "15 Min" },
                      { value: "60", label: "1 Hr" },
                      { value: "1440", label: "24 Hr" },
                      { value: "once", label: "Single-Download" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDuration(opt.value as ExpirationOption)}
                        className={`py-2 px-3 text-xs rounded-lg font-medium border transition-all cursor-pointer ${
                          duration === opt.value
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  
                  <p className="text-xs text-slate-400 font-light italic leading-relaxed pt-1 flex items-start gap-1">
                    <CornerDownRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-300" />
                    {duration === "once" 
                      ? "File expires automatically after one full download, or within 1 hour if it sits stale."
                      : `The file link remains hostable for exactly ${duration} min(s) or until manually cancelled.`}
                  </p>
                </motion.div>
              )}

              {/* Error messages */}
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Action Buttons */}
              {file && (
                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400/80 text-white font-medium text-sm rounded-xl transition-all duration-200 shadow-md shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Transmitting File ({progress}%)</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      <span>Generate Secure Send Key</span>
                    </>
                  )}
                </button>
              )}

              {/* Uploading progress bar details */}
              {uploading && (
                <div className="space-y-2">
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-indigo-600 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>Transmitting pack data...</span>
                    <span>{progress}% Completed</span>
                  </div>
                </div>
              )}

            </form>
          </motion.div>
        ) : (
          /* SUCCESS SCREEN DISPLAY */
          <motion.div
            key="upload-success"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Your File is Secured & Ready</h3>
              <p className="text-xs text-slate-400">
                Share this unique key or instant link. The recipient doesn't need an account.
              </p>
            </div>

            {/* Unique Key Card */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="relative bg-slate-50 border border-slate-100 rounded-2xl p-6 shadow-2xs max-w-sm mx-auto"
            >
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Unified Key Code
              </p>
              
              <div className="flex items-center justify-center gap-1.5 mb-1">
                {result.key.split("").map((char, index) => (
                  <div 
                    key={index}
                    className="w-10 h-12 bg-white rounded-lg border border-slate-100 text-lg font-mono font-bold text-slate-800 flex items-center justify-center shadow-2xs"
                  >
                    {char}
                  </div>
                ))}
              </div>

              <div className="flex justify-center mt-3">
                <button
                  type="button"
                  onClick={() => copyToClipboard(result.key, false)}
                  className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 py-1 px-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  {copiedKey ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600">Copied Code</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>

            {/* Instant Link Card */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="bg-white border border-slate-100 p-4 rounded-xl text-left shadow-2xs"
            >
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Instant Shareable Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={getFullDownloadUrl(result.key)}
                  className="bg-slate-50 text-slate-600 text-xs font-mono font-medium p-2 rounded-lg border border-slate-100 flex-1 min-w-0"
                />
                <button
                  onClick={() => copyToClipboard(getFullDownloadUrl(result.key), true)}
                  className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-all shrink-0 cursor-pointer flex items-center justify-center h-8.5"
                  title="Copy Link URL"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1.5 font-medium">
                <span>Uploaded:</span>
                {(() => {
                  const SuccessFileIcon = getFileIconComponent(result.file.mimetype, result.file.filename);
                  return <SuccessFileIcon className="w-3.5 h-3.5 text-indigo-500" />;
                })()}
                <span className="font-semibold text-slate-700 truncate max-w-[180px] sm:max-w-[240px]" title={result.file.filename}>
                  {result.file.filename}
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-mono text-slate-500 shrink-0">{formatBytes(result.file.size)}</span>
              </div>
            </motion.div>

            {/* Mobile QR Code Collapser */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="bg-slate-50 border border-slate-100 rounded-xl overflow-hidden shadow-2xs"
            >
              <button
                type="button"
                onClick={() => setShowQr(!showQr)}
                className="w-full p-3 flex items-center justify-between text-left text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-100/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-indigo-500" />
                  <span>Scan Mobile QR Code</span>
                </div>
                <span className="text-[10px] bg-slate-200/60 text-slate-650 px-2 py-0.5 rounded-full font-mono font-bold">
                  {showQr ? "HIDE" : "SHOW"}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {showQr && (
                  <motion.div
                    initial={{ height: 0, opacity: 0-2 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0-2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="p-4 border-t border-slate-100 bg-white flex flex-col items-center justify-center space-y-2.5">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-center">
                        <QRCodeSVG
                          value={getFullDownloadUrl(result.key)}
                          size={140}
                          level="M"
                          includeMargin={false}
                          className="w-35 h-35 text-slate-800"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal max-w-[240px]">
                        Point your mobile camera at this QR code to access the secure file retrieve page directly on your phone.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Revoke and Actions footer */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, delay: 0.25 }}
              className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-2 justify-center max-w-sm mx-auto"
            >
              <button
                onClick={resetUploadForm}
                className="flex-1 h-9 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload Another</span>
              </button>

              <button
                onClick={handleRevoke}
                disabled={revoking}
                className="flex-1 h-9 bg-rose-50 hover:bg-rose-100 text-rose-600 disabled:opacity-50 font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                title="Cancel sharing and purge file immediately"
              >
                {revoking ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Revoke Access</span>
              </button>
            </motion.div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
