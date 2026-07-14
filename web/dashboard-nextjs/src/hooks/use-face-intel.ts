"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";

export interface FaceMatchMeta {
  matched: boolean;
  confidence: number;
  face_detected: boolean;
  face_boxes?: number[][];
  vip_id?: string | null;
  nid?: string | null;
  representative_id?: string | null;
  engine?: string;
}

export interface EthicalReportCard {
  matched?: boolean;
  vip_name: string | null;
  designation: string | null;
  ethical_score: number | null;
  red_flags_count: number | null;
  key_allegations: string[];
  representative_id?: string;
  nid?: string;
  designation_bn?: string;
  party?: string;
  window_days?: number;
  public_activity_count?: number;
  complaint_proxy_count?: number;
  match?: FaceMatchMeta | null;
  explanation?: string;
  explanation_bn?: string;
  message?: string;
  gallery_size?: number;
}

export interface VipGalleryItem {
  vip_id: string;
  nid: string;
  name: string;
  designation: string;
  designation_bn: string;
  representative_id: string;
  party: string | null;
  sample_path: string;
}

function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("read_failed"));
    reader.readAsDataURL(file);
  });
}

export function useFaceIntel() {
  const [card, setCard] = useState<EthicalReportCard | null>(null);
  const [gallery, setGallery] = useState<VipGalleryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const loadGallery = useCallback(async () => {
    try {
      const json = await apiClient<{
        success: boolean;
        data: { vips: VipGalleryItem[]; count: number };
      }>("intelligence/face-intel/gallery");
      setGallery(json.data.vips ?? []);
    } catch {
      setGallery([]);
    }
  }, []);

  useEffect(() => {
    void loadGallery();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [loadGallery]);

  const identify = useCallback(
    async (body: { image_base64?: string; nid?: string; lang?: "bn" | "en" }) => {
      setLoading(true);
      setError(null);
      try {
        const json = await apiClient<{ success: boolean; data: EthicalReportCard }>(
          "intelligence/face-intel/identify",
          {
            method: "POST",
            body: JSON.stringify({
              ...body,
              demo_fallback: true,
              threshold: 0.72,
            }),
          },
        );
        setCard(json.data);
        return json.data;
      } catch (err) {
        setCard(null);
        setError(err instanceof Error ? err.message : "Face identify failed");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const identifyFile = useCallback(
    async (file: File, lang: "bn" | "en" = "bn") => {
      const image_base64 = await fileToBase64(file);
      return identify({ image_base64, lang });
    },
    [identify],
  );

  const identifyNid = useCallback(
    async (nid: string, lang: "bn" | "en" = "bn") => identify({ nid, lang }),
    [identify],
  );

  const startCamera = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const captureAndIdentify = useCallback(
    async (lang: "bn" | "en" = "bn") => {
      const video = videoRef.current;
      if (!video) throw new Error("camera_not_ready");
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image_base64 = canvas.toDataURL("image/jpeg", 0.88);
      return identify({ image_base64, lang });
    },
    [identify],
  );

  return {
    card,
    setCard,
    gallery,
    loading,
    error,
    videoRef,
    identifyFile,
    identifyNid,
    startCamera,
    stopCamera,
    captureAndIdentify,
    loadGallery,
  };
}
