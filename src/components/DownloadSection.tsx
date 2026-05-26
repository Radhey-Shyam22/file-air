import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Download, FileDown, Search, ArrowRight, CornerDownRight, 
  AlertCircle, ChevronRight, Clock, RefreshCcw, Landmark, Info
} from "lucide-react";
import { FileTransfer } from "../types";
import { formatBytes, formatTimeRemaining } from "../lib/format";
import { getFileIconComponent } from "../lib/fileIcon";

interface DownloadSectionProps {
  initialKey?: string;
  onDownloadExecuted: () => void;
}

export default function DownloadSection({ initialKey = "", onDownloadExecuted }: DownloadSectionProps) {
  const [keyInput, setKeyInput] = useState(initialKey.trim().toUpperCase());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileDetails, setFileDetails] = useState<FileTransfer | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const lookupRef = useRef<string>("");

  // Real-time transfer download states
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [downloadEta, setDownloadEta] = useState<string>("");
  const downloadXhrRef = useRef<XMLHttpRequest | null>(null);

  // Handle auto-searching if initialKey is supplied
  useEffect(() => {
    if (initialKey) {
      const sanitized = initialKey.trim().toUpperCase();
      setKeyInput(sanitized);
      triggerLookup(sanitized);
    }
  }, [initialKey]);

  // Handle active countdown countdown timers
  useEffect(() => {
    if (!fileDetails) return;

    const updateTimer = () => {
      const remainingText = formatTimeRemaining(fileDetails.expiresAt);
      if (remainingText === "Expired") {
        setFileDetails(null);
        setError("This transfer file has expired.");
      } else {
        setTimeRemaining(remainingText);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [fileDetails]);

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6);
    setKeyInput(value);
    setError(null);
  };

  const triggerLookup = async (lookupKey: string) => {
    if (lookupKey.length !== 6) {
      setError("Keys must be exactly 6 alphanumeric characters.");
      return;
    }

    setLoading(true);
    setError(null);
    setFileDetails(null);
    
    try {
      const response = await fetch(`/api/file-info/${lookupKey}`);
      const data = await response.json();
      
      if (data.success && data.file) {
        setFileDetails(data.file);
      } else {
        setError(data.error || "No secure transfer package found for this key.");
      }
    } catch (err) {
      setError("Could not reach the server to fetch file information. Please check your setup.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerLookup(keyInput);
  };

  const handleDownload = () => {
    if (!fileDetails) return;

    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadedBytes(0);
    setDownloadSpeed(0);
    setDownloadEta("");
    setError(null);

    const xhr = new XMLHttpRequest();
    xhr.open("GET", `/api/download/${fileDetails.key}`, true);
    xhr.responseType = "blob";

    const startTime = Date.now();
    downloadXhrRef.current = xhr;

    xhr.onprogress = (event) => {
      if (event.lengthComputable) {
        const loaded = event.loaded;
        const total = event.total;
        const progress = Math.round((loaded / total) * 100);

        const currentTime = Date.now();
        const elapsedTime = (currentTime - startTime) / 1000; // in seconds

        let speed = 0;
        let etaStr = "";
        if (elapsedTime > 0) {
          speed = loaded / elapsedTime;
          const remainingBytes = total - loaded;
          if (speed > 0) {
            const remainingTimeInSeconds = remainingBytes / speed;
            if (remainingTimeInSeconds < 60) {
              etaStr = `${Math.ceil(remainingTimeInSeconds)}s remaining`;
            } else {
              const minutes = Math.floor(remainingTimeInSeconds / 60);
              const seconds = Math.ceil(remainingTimeInSeconds % 60);
              etaStr = `${minutes}m ${seconds}s remaining`;
            }
          }
        }

        setDownloadProgress(progress);
        setDownloadedBytes(loaded);
        setDownloadSpeed(speed);
        setDownloadEta(etaStr);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const blob = xhr.response;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileDetails.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        // Notify parent component so they can trigger global data updates / stat refreshes
        onDownloadExecuted();

        setIsDownloading(false);
        downloadXhrRef.current = null;

        if (fileDetails.singleUse) {
          setFileDetails(null);
          setKeyInput("");
          setError("File transfer complete. Single-use package successfully consumed & destroyed from storage.");
        }
      } else {
        setIsDownloading(false);
        downloadXhrRef.current = null;
        setError("Download failed. The file may have been consumed, deleted, or is no longer available.");
      }
    };

    xhr.onerror = () => {
      setIsDownloading(false);
      downloadXhrRef.current = null;
      setError("An error occurred during file transmission. Please check your internet connection.");
    };

    xhr.onabort = () => {
      setIsDownloading(false);
      downloadXhrRef.current = null;
    };

    xhr.send();
  };

  const cancelDownload = () => {
    if (downloadXhrRef.current) {
      downloadXhrRef.current.abort();
      downloadXhrRef.current = null;
    }
  };

  const clearAndReset = () => {
    cancelDownload();
    setKeyInput("");
    setFileDetails(null);
    setError(null);
  };

  return (
    <div className="p-6 md:p-8">
      <AnimatePresence mode="wait">
        {!fileDetails ? (
          /* CODE SEARCH MODE */
          <motion.div
            key="search-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="text-center space-y-2 max-w-sm mx-auto">
                <div className="mx-auto w-10.5 h-10.5 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
                  <FileDown className="w-5.5 h-5.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Retrieve a Shared File</h3>
                  <p className="text-xs text-slate-400">
                    Input the 6-character key to check the status or access files instantly.
                  </p>
                </div>
              </div>

              {/* Key Code Block Inputs */}
              <div className="max-w-xs mx-auto space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    value={keyInput}
                    onChange={handleKeyChange}
                    placeholder="E.G. X9BD4T"
                    className="w-full tracking-[0.25em] font-mono text-center text-xl font-bold uppercase border-2 border-slate-200 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 outline-hidden h-14 bg-white rounded-xl text-slate-800 placeholder:text-slate-300 placeholder:tracking-normal transition-all"
                    maxLength={6}
                    autoFocus
                  />
                  {keyInput.length === 6 && !loading && (
                    <button
                      type="submit"
                      className="absolute right-2.5 top-2.5 h-9 w-9 bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center rounded-lg shadow-sm transition-all focus:ring-2 focus:ring-indigo-200 cursor-pointer"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || keyInput.length !== 6}
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-medium text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer cursor-not-allowed disabled:shadow-none shadow-sm"
                >
                  {loading ? (
                    <>
                      <RefreshCcw className="w-4 h-4 animate-spin text-indigo-600" />
                      <span className="text-slate-500">Retrieving Information...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Fetch Transfer Info</span>
                    </>
                  )}
                </button>
              </div>

              {/* Input Error states */}
              {error && (
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-slate-600 text-xs flex items-center gap-2 max-w-sm mx-auto shadow-2xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                  <span className="font-medium text-slate-600 leading-relaxed">{error}</span>
                </div>
              )}

            </form>
          </motion.div>
        ) : (
          /* PREVIEW FILE STATE - Ready for streaming */
          <motion.div
            key="search-result"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 text-center max-w-md mx-auto"
          >
            {(() => {
              const DynamicFileIcon = getFileIconComponent(fileDetails.mimetype, fileDetails.filename);
              return (
                <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
                  <DynamicFileIcon className="w-7 h-7" />
                </div>
              );
            })()}

            <div className="space-y-2">
              <div className="mx-auto inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-mono uppercase tracking-wider">
                <span className="font-bold">Key Verified:</span> {fileDetails.key}
              </div>
              <h3 className="text-lg font-bold text-slate-900 truncate px-4" title={fileDetails.filename}>
                {fileDetails.filename}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Size: <span className="font-semibold text-slate-700">{formatBytes(fileDetails.size)}</span>
              </p>
            </div>

            {/* Expire and count indicators summary */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 border border-slate-100 rounded-xl text-left">
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  Active Lifespan
                </p>
                <p className="text-xs font-semibold text-slate-700 mt-1 flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                  {timeRemaining}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  Security Status
                </p>
                <p className="text-xs font-semibold text-slate-700 mt-1">
                  {fileDetails.singleUse ? "One-Download Only" : "Standard Multi-use"}
                </p>
              </div>
            </div>

            {/* Help guidelines explaining download logic */}
            {fileDetails.singleUse && (
              <div className="p-3 bg-amber-50 rounded-lg text-[11px] text-amber-700 leading-relaxed text-left flex gap-1.5 items-start">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  <strong>Important:</strong> This file is configured as high-security <strong>Single-Download</strong>. After clicking the stream trigger below, it is permanently deleted from server disks.
                </span>
              </div>
            )}

            {isDownloading ? (
              <div className="space-y-4 p-4 border border-indigo-100 bg-indigo-50/50 rounded-2xl text-left">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                    <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                    Downloading...
                  </span>
                  <span className="text-xs font-mono font-semibold text-indigo-600">
                    {downloadProgress}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                  <motion.div 
                    className="h-full bg-indigo-600 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: `${downloadProgress}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                      Downloaded
                    </span>
                    <span className="font-mono text-slate-700 font-medium whitespace-nowrap">
                      {formatBytes(downloadedBytes)} <span className="text-slate-400">/ {formatBytes(fileDetails.size)}</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                      Speed
                    </span>
                    <span className="font-mono text-slate-700 font-semibold whitespace-nowrap">
                      {formatBytes(downloadSpeed)}/s
                    </span>
                  </div>
                </div>

                {/* ETA and Cancel row */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-200/45 text-xs">
                  <span className="text-slate-500 font-mono italic">
                    {downloadEta || "estimating..."}
                  </span>
                  <button
                    onClick={cancelDownload}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-500 hover:text-white hover:bg-rose-500 border border-slate-200 hover:border-rose-500 rounded-lg transition-all cursor-pointer shadow-2xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* ACTION DIRECT TRIGGER BUTTON */
              <button
                disabled={isDownloading}
                onClick={handleDownload}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4 animate-bounce" />
                <span>Download & Stream Original</span>
              </button>
            )}

            {/* Go Back button */}
            <button
              onClick={clearAndReset}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 hover:underline transition-colors block mx-auto cursor-pointer"
            >
              Search for Another Key
            </button>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
