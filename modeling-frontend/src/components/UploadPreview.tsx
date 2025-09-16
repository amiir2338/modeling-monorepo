"use client";

import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

type Props = {
  accept?: string; // e.g. "image/*"
  maxSizeBytes?: number; // optional size limit
  onUploaded?: (url: string) => void; // returns uploaded file url (backend endpoint dependent)
  uploadUrl?: string; // optional override for upload endpoint
};

export default function UploadPreview({ accept = "image/*", maxSizeBytes = 5_242_880, onUploaded, uploadUrl = "/api/v1/uploads" }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const onFile = (f?: File) => {
    setError(null);
    if (!f) return setFile(null);
    if (maxSizeBytes && f.size > maxSizeBytes) {
      setError(`فایل بزرگتر از ${Math.round(maxSizeBytes / 1024 / 1024)}MB است`);
      return;
    }
    setFile(f);
  };

  const startUpload = async () => {
    if (!file) return;
    try {
      setProgress(0);
      const form = new FormData();
      form.append("file", file);
      const source = axios.CancelToken.source();
      cancelRef.current = () => source.cancel("user-cancel");
      const res = await axios.post(uploadUrl, form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (ev) => {
          if (ev.total) setProgress(Math.round((ev.loaded / ev.total) * 100));
        },
        cancelToken: source.token,
      });
      // Expect backend to return { url: string } or similar
      const url = res?.data?.url || res?.data?.data?.url || "";
      if (url && typeof onUploaded === "function") onUploaded(url);
    } catch (e: any) {
      if (axios.isCancel(e)) setError("آپلود لغو شد");
      else setError(e?.message || "خطا در آپلود");
      setProgress(0);
    } finally {
      cancelRef.current = null;
    }
  };

  return (
    <div className="upload-preview w-full">
      <label className="block text-sm font-medium text-slate-700 mb-2">ضمیمه (اختیاری)</label>
      <div className="flex gap-3 items-center">
        <input
          type="file"
          accept={accept}
          onChange={(e) => onFile(e.target.files?.[0])}
          data-testid="upload-input"
        />
        {file && (
          <div className="flex items-center gap-2">
            <div className="w-20 h-20 overflow-hidden rounded-md border bg-white">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">Preview</div>
              )}
            </div>
            <div className="flex flex-col">
              <div className="text-xs text-slate-600">{file.name}</div>
              <div className="text-xs text-slate-500">{Math.round(file.size / 1024)} KB</div>
              <div className="mt-2 flex gap-2">
                <button type="button" className="btn btn-sm" onClick={startUpload} data-testid="upload-start">آپلود</button>
                <button type="button" className="btn btn-sm" onClick={() => onFile(undefined)} data-testid="upload-clear">حذف</button>
                {cancelRef.current && (
                  <button type="button" className="btn btn-sm text-rose-600" onClick={() => cancelRef.current && cancelRef.current()} data-testid="upload-cancel">لغو</button>
                )}
              </div>
              {progress > 0 && (
                <div className="w-full mt-2">
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-2 bg-indigo-500" style={{ width: `${progress}%` }} data-testid="upload-progress" />
                  </div>
                  <div className="text-xs text-slate-500">{progress}%</div>
                </div>
              )}
              {error && <div className="text-xs text-rose-600 mt-2" data-testid="upload-error">{error}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
