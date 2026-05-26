import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Upload, Download, ShieldCheck, Zap, Trash2, Clock, 
  Database, Share2, HelpCircle, HardDriveDownload
} from "lucide-react";
import UploadSection from "./components/UploadSection";
import DownloadSection from "./components/DownloadSection";
import StatsDashboard from "./components/StatsDashboard";

type AccessTab = "send" | "receive";

export default function App() {
  const [activeTab, setActiveTab] = useState<AccessTab>("send");
  const [urlKey, setUrlKey] = useState<string>("");
  const [refreshStats, setRefreshStats] = useState(0);

  // Hook into URL search params for quick keys (e.g., ?key=X7A8D3)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const key = searchParams.get("key");
    if (key && key.trim().length === 6) {
      setUrlKey(key.trim().toUpperCase());
      setActiveTab("receive");
    }
  }, []);

  const triggerStatsRefresh = () => {
    setRefreshStats((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Structural Top Header Banner */}
      <header className="w-full bg-white border-b border-slate-100 py-4.5 px-6 sm:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Share2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900">
                FileAir
              </h1>
              <p className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                Secure File Sharing by RadiumIX Developers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-wider">Live Cache Server</span>
          </div>
        </div>
      </header>

      {/* Main Structural Layout Grid */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden flex flex-col">
          
          {/* Top Tabs */}
          <div className="grid grid-cols-2 border-b border-slate-100 p-2 bg-slate-50/50">
            <button
              id="tab-send"
              onClick={() => {
                setActiveTab("send");
                // Clear URL parameters when clicking Send to allow a fresh start
                if (window.history.pushState) {
                  const newurl = window.location.protocol + "//" + window.location.host + window.location.pathname;
                  window.history.pushState({ path: newurl }, "", newurl);
                }
              }}
              className={`py-3 px-4 rounded-xl text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "send"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100/50"
              }`}
            >
              <Upload className="w-4 h-4" />
              Send File
            </button>

            <button
              id="tab-receive"
              onClick={() => setActiveTab("receive")}
              className={`py-3 px-4 rounded-xl text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "receive"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100/50"
              }`}
            >
              <Download className="w-4 h-4" />
              Retrieve File
            </button>
          </div>

          {/* Sub-modules Canvas Area */}
          <div className="flex-1 min-h-[340px] flex flex-col justify-center">
            {activeTab === "send" ? (
              <UploadSection onUploadSuccess={triggerStatsRefresh} />
            ) : (
              <DownloadSection 
                initialKey={urlKey} 
                onDownloadExecuted={triggerStatsRefresh} 
              />
            )}
          </div>

          {/* Stats Badge Section */}
          <StatsDashboard refreshTrigger={refreshStats} />

        </div>

        {/* Informative Value Cards */}
        <div className="w-full max-w-lg mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-800">Zero Logs</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                Files are decrypted in memory cache and stored raw, never cataloged.
              </p>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-800">Auto Purging</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                Transfers self-destruct upon key expiration or download completion.
              </p>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-800">Peer Delivery</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                Send instantly by providing a custom 6-letter PIN securely to peers.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Modern Humble System Footer */}
      <footer className="w-full py-6 text-center border-t border-slate-100 bg-white space-y-1">
        <p className="text-[10px] text-slate-400 font-medium tracking-tight flex items-center justify-center gap-1.5 leading-snug">
          <span>Secure temporary transport protocol</span>
          <span className="text-slate-200">•</span>
          <span>Automatic physical file destruction guarantees active disk safety</span>
        </p>
        <p className="text-[10px] text-slate-400 font-medium">
          © {new Date().getFullYear()} <span className="font-semibold text-slate-700">RadiumIX Developers</span>. All rights reserved.
        </p>
      </footer>

    </div>
  );
}
