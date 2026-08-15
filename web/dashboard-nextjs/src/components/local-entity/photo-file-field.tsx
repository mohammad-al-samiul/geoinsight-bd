"use client";

import { useRef, useState } from "react";
import { Camera, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_BYTES = 450_000;

async function fileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("IMAGE_ONLY");
  }
  if (file.size > MAX_BYTES * 1.4) {
    // Compress via canvas for large camera photos.
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, Math.sqrt((MAX_BYTES * 1.2) / file.size));
    const w = Math.max(320, Math.round(bitmap.width * scale));
    const h = Math.max(240, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(bitmap, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.72);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}

export function PhotoFileField({
  label,
  value,
  onChange,
  className,
  placeholder = "https://… or upload",
  imageOnlyError = "Image only",
  uploadFailedError = "Upload failed",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  className?: string;
  placeholder?: string;
  imageOnlyError?: string;
  uploadFailedError?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="flex flex-wrap gap-2">
        <input
          value={value.startsWith("data:image/") ? "" : value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-secondary/40 px-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
          placeholder={placeholder}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-10"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? <Camera className="h-3.5 w-3.5 animate-pulse" /> : <Upload className="h-3.5 w-3.5" />}
        </Button>
        {value && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-10"
            onClick={() => onChange("")}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setBusy(true);
            setErr(null);
            void fileToDataUrl(file)
              .then(onChange)
              .catch((error) =>
                setErr(
                  error instanceof Error && error.message === "IMAGE_ONLY"
                    ? imageOnlyError
                    : uploadFailedError,
                ),
              )
              .finally(() => setBusy(false));
          }}
        />
      </div>
      {value.startsWith("data:image/") && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt={label}
          className="mt-1 h-20 w-28 rounded-md object-cover ring-1 ring-border/60"
        />
      )}
      {err && <p className="text-[11px] text-destructive">{err}</p>}
    </div>
  );
}
