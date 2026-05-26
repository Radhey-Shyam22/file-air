import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { X, AlertCircle, RefreshCw, Camera, Scan } from "lucide-react";
import jsQR from "jsqr";

interface QRScannerProps {
  onScanSuccess: (key: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScanSuccess, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function initCamera() {
      try {
        setError(null);
        setIsReady(false);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } }
        });
        
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true"); // iOS requirement
          await videoRef.current.play();
          setIsReady(true);
          animationFrameRef.current = requestAnimationFrame(scanTick);
        }
      } catch (err: any) {
        console.error("Camera permissions/access error:", err);
        setError("Camera permission denied or camera not found. Please ensure camera permissions are granted in your browser settings.");
      }
    }

    initCamera();

    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const scanTick = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const width = video.videoWidth;
      const height = video.videoHeight;

      const canvas = canvasRef.current || document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code) {
          const parsedKey = parseScannedData(code.data);
          if (parsedKey) {
            onScanSuccess(parsedKey);
            stopCamera();
            return;
          }
        }
      }
    }
    animationFrameRef.current = requestAnimationFrame(scanTick);
  };

  const parseScannedData = (data: string): string | null => {
    const trimmed = data.trim();
    
    // 1. Direct 6-character alphanum key: e.g. "X9BD4T"
    if (/^[A-Z0-9]{6}$/i.test(trimmed)) {
      return trimmed.toUpperCase();
    }

    // 2. URL format with query param key matching pattern: e.g. "?key=XYZABC"
    try {
      const url = new URL(trimmed);
      const keyParam = url.searchParams.get("key");
      if (keyParam && /^[A-Z0-9]{6}$/i.test(keyParam)) {
        return keyParam.toUpperCase();
      }

      // 3. Segment of path format: e.g. "/download/XYZABC" or "/XYZABC"
      const segments = url.pathname.split("/").filter(Boolean);
      for (const seg of segments) {
        if (/^[A-Z0-9]{6}$/i.test(seg)) {
          return seg.toUpperCase();
        }
      }
    } catch (e) {
      // Not a valid URL, do generic search for any standalone 6-char block
      const matches = trimmed.match(/\b[a-zA-Z0-9]{6}\b/g);
      if (matches && matches.length > 0) {
        return matches[0].toUpperCase();
      }
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 flex flex-col"
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">Scan QR Code</h4>
              <p className="text-[10px] text-slate-400">Position the QR code within the target area</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video stream container */}
        <div className="relative aspect-square w-full bg-slate-950 flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="p-6 text-center space-y-3 max-w-xs">
              <div className="mx-auto w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  window.location.reload();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Retry Permission
              </button>
            </div>
          ) : (
            <>
              {/* HTML5 video feed */}
              <video
                ref={videoRef}
                className="w-full h-full object-cover transform scale-x-100"
                muted
                playsInline
              />

              {/* Glowing scanner targeting HUD UI */}
              {isReady && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="relative w-2/3 aspect-square max-w-[240px] border-2 border-dashed border-white/20 rounded-2xl flex items-center justify-center">
                    {/* Glowing outer corners */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] border-emerald-500 rounded-tl-xl transform -translate-x-[2px] -translate-y-[2px]" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] border-emerald-500 rounded-tr-xl transform translate-x-[2px] -translate-y-[2px]" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-[3px] border-l-[3px] border-emerald-500 rounded-bl-xl transform -translate-x-[2px] translate-y-[2px]" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] border-emerald-500 rounded-br-xl transform translate-x-[2px] translate-y-[2px]" />

                    {/* Laser line moving animation */}
                    <motion.div
                      className="absolute inset-x-2 h-[2px] bg-emerald-400/80 shadow-[0_0_8px_4px_rgba(52,211,153,0.4)]"
                      animate={{ top: ["8%", "92%", "8%"] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                    
                    <Scan className="w-8 h-8 text-emerald-400/40 animate-pulse absolute" />
                  </div>

                  {/* Shading outside active area */}
                  <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px] mix-blend-multiply" />
                  <div className="absolute w-2/3 aspect-square max-w-[240px] bg-transparent outline-[9999px] outline-black/45 rounded-2xl" />
                </div>
              )}

              {/* Startup loader states */}
              {!isReady && (
                <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
                  <span className="text-xs text-slate-400 font-mono">Initializing camera feed...</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer info/controls */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 text-center">
          <span className="text-[11px] font-medium text-slate-500">
            Powered by modern client-side scanning engine
          </span>
        </div>
      </motion.div>
    </div>
  );
}
