import { 
  File, 
  FileImage, 
  FileText, 
  FileAudio, 
  FileVideo, 
  FileSpreadsheet, 
  FileCode, 
  FileArchive 
} from "lucide-react";

/**
 * Dynamically resolves the most appropriate Lucide icon component based on the
 * file MIME type, with a fallback check of the filename extension.
 */
export function getFileIconComponent(mimetype: string, filename: string = "") {
  const mime = (mimetype || "").toLowerCase();
  const file = (filename || "").toLowerCase();

  // 1. Check MIME pattern
  if (mime.startsWith("image/")) {
    return FileImage;
  }
  if (mime.startsWith("audio/")) {
    return FileAudio;
  }
  if (mime.startsWith("video/")) {
    return FileVideo;
  }
  if (
    mime.startsWith("text/") || 
    mime === "application/pdf" || 
    mime === "application/msword" ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    // Specifically parse programming languages later, otherwise text/doc
    if (
      file.endsWith(".js") || 
      file.endsWith(".ts") || 
      file.endsWith(".jsx") || 
      file.endsWith(".tsx") || 
      file.endsWith(".html") || 
      file.endsWith(".css") || 
      file.endsWith(".json")
    ) {
      return FileCode;
    }
    return FileText;
  }
  if (
    mime === "application/vnd.ms-excel" || 
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mime === "text/csv" ||
    file.endsWith(".csv") ||
    file.endsWith(".xls") ||
    file.endsWith(".xlsx")
  ) {
    return FileSpreadsheet;
  }
  if (
    mime === "application/json" || 
    mime === "application/xml" || 
    mime === "application/javascript" ||
    file.endsWith(".xml") ||
    file.endsWith(".json")
  ) {
    return FileCode;
  }
  if (
    mime === "application/zip" || 
    mime === "application/x-zip-compressed" || 
    mime === "application/x-tar" || 
    mime === "application/x-rar-compressed" || 
    mime === "application/gzip" || 
    file.endsWith(".zip") || 
    file.endsWith(".rar") || 
    file.endsWith(".tar") || 
    file.endsWith(".gz") || 
    file.endsWith(".7z")
  ) {
    return FileArchive;
  }

  // 2. Fallbacks based on common extensions
  if (/\.(jpg|jpeg|png|gif|svg|webp|bmp|ico)$/i.test(file)) {
    return FileImage;
  }
  if (/\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(file)) {
    return FileAudio;
  }
  if (/\.(mp4|mkv|avi|mov|webm|flv|wmv)$/i.test(file)) {
    return FileVideo;
  }
  if (/\.(doc|docx|pdf|txt|rtf|odt)$/i.test(file)) {
    return FileText;
  }

  return File; // General file icon fallback
}
