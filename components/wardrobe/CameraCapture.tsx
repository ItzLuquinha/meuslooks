"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Check, RotateCcw, X } from 'lucide-react';

export default function CameraCapture({ onUse, onCancel }: { onUse: (file: File) => void; onCancel: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [captured, setCaptured] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async (requestedFacing: 'environment' | 'user' = facing) => {
    stopStream();
    setStarting(true);
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('A câmera não está disponível neste navegador.');
      setStarting(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: requestedFacing }, width: { ideal: 1280 }, height: { ideal: 1600 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setError('Não conseguimos acessar a câmera. Verifique as permissões do navegador.');
    } finally {
      setStarting(false);
    }
  }, [facing, stopStream]);

  useEffect(() => {
    if (!captured) void startCamera();
    return () => stopStream();
  }, [captured, startCamera, stopStream]);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `meu-look-${Date.now()}.webp`, { type: 'image/webp' });
      const url = URL.createObjectURL(file);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = url;
      setCaptured(file);
      setPreviewUrl(url);
      stopStream();
    }, 'image/webp', 0.88);
  }

  function retake() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setCaptured(null);
    setPreviewUrl(null);
  }

  function cancel() {
    stopStream();
    onCancel();
  }

  if (captured && previewUrl) {
    return <div className="camera-wrap"><div className="camera-stage"><img src={previewUrl} alt="Foto capturada" /></div><div className="camera-actions"><button type="button" className="btn btn-ghost" onClick={cancel}><X size={17}/>Cancelar</button><button type="button" className="btn btn-soft" onClick={retake}><RotateCcw size={17}/>Tirar outra</button><button type="button" className="btn btn-primary" onClick={() => { stopStream(); onUse(captured); }}><Check size={17}/>Usar foto</button></div></div>;
  }

  return <div className="camera-wrap"><div className="camera-stage">{starting && <div className="camera-status">Abrindo câmera…</div>}<video ref={videoRef} playsInline muted autoPlay /></div>{error && <div className="card alert-card" role="alert">{error}</div>}<div className="camera-actions"><button type="button" className="btn btn-ghost" onClick={cancel}><X size={17}/>Cancelar</button><button type="button" className="btn btn-primary" onClick={capture} disabled={starting || Boolean(error)}><Camera size={18}/>Capturar</button><button type="button" className="btn btn-soft" onClick={() => { const next = facing === 'environment' ? 'user' : 'environment'; setFacing(next); void startCamera(next); }} disabled={starting}><RotateCcw size={17}/>Trocar</button></div></div>;
}
