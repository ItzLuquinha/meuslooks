"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Contrast,
  FlipHorizontal,
  RotateCcw,
  Send,
  SlidersHorizontal,
  Sparkles,
  SunMedium,
  Thermometer,
  X,
} from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import Modal from '@/components/ui/Modal';

type FilterName = 'natural' | 'soft' | 'rose' | 'mono' | 'warm';
type Adjustments = { exposure: number; lighting: number; contrast: number; saturation: number; warmth: number };
const DEFAULT_ADJUSTMENTS: Adjustments = { exposure: 0, lighting: 0, contrast: 0, saturation: 0, warmth: 0 };
const FILTERS: Array<{ id: FilterName; label: string; adjustments: Partial<Adjustments> }> = [
  { id: 'natural', label: 'Natural', adjustments: {} },
  { id: 'soft', label: 'Suave', adjustments: { exposure: 5, lighting: 7, contrast: -8, saturation: -4, warmth: 3 } },
  { id: 'rose', label: 'Rosé', adjustments: { exposure: 3, lighting: 6, contrast: -4, saturation: 9, warmth: 14 } },
  { id: 'mono', label: 'P&B', adjustments: { contrast: 10, saturation: -100, warmth: 0 } },
  { id: 'warm', label: 'Quente', adjustments: { exposure: 2, lighting: 4, contrast: 2, saturation: 6, warmth: 18 } },
];
function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }
function filterCss(filter: FilterName, adjustments: Adjustments) {
  const preset = FILTERS.find((entry) => entry.id === filter)?.adjustments ?? {};
  const exposure = adjustments.exposure + (preset.exposure ?? 0);
  const lighting = adjustments.lighting + (preset.lighting ?? 0);
  const contrast = adjustments.contrast + (preset.contrast ?? 0);
  const saturation = adjustments.saturation + (preset.saturation ?? 0);
  const warmth = adjustments.warmth + (preset.warmth ?? 0);
  const brightness = 1 + exposure * 0.006 + lighting * 0.0045;
  const contrastFactor = 1 + contrast * 0.006;
  const saturationFactor = 1 + saturation * 0.007;
  const sepia = clamp(Math.max(warmth, 0) * 0.0034, 0, 0.22);
  return `brightness(${brightness.toFixed(3)}) contrast(${contrastFactor.toFixed(3)}) saturate(${saturationFactor.toFixed(3)}) sepia(${sepia.toFixed(3)}) hue-rotate(${clamp(warmth * -0.18, -8, 8).toFixed(2)}deg)`;
}

export default function LookCameraClient() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [filter, setFilter] = useState<FilterName>('natural');
  const [adjustments, setAdjustments] = useState<Adjustments>(DEFAULT_ADJUSTMENTS);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [paused, setPaused] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);
  const cleanupPreview = useCallback(() => {
    setCapturedUrl((current) => { if (current) URL.revokeObjectURL(current); return null; });
  }, []);
  const startCamera = useCallback(async () => {
    stopStream(); setPaused(false); setStarting(true); setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
    } catch {
      setError('Não conseguimos acessar a câmera. Verifique as permissões do navegador.');
    } finally { setStarting(false); }
  }, [facing, stopStream]);

  useEffect(() => {
    if (!capturedUrl && !sent && !paused) void startCamera();
    return () => stopStream();
  }, [capturedUrl, sent, paused, startCamera, stopStream]);
  useEffect(() => () => { if (capturedUrl) URL.revokeObjectURL(capturedUrl); }, [capturedUrl]);

  const previewFilter = useMemo(() => filterCss(filter, adjustments), [filter, adjustments]);

  function capture() {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 2000 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale); canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext('2d'); if (!context) return;
    if (facing === 'user') { context.translate(canvas.width, 0); context.scale(-1, 1); }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `meu-look-${Date.now()}.jpg`, { type: 'image/jpeg' });
      cleanupPreview(); setCapturedFile(file); setCapturedUrl(URL.createObjectURL(file)); setFilter('natural'); setAdjustments(DEFAULT_ADJUSTMENTS); setShowEditor(true); setSent(false); stopStream();
    }, 'image/jpeg', 0.92);
  }

  function retake() { cleanupPreview(); setCapturedFile(null); setShowEditor(false); setSent(false); setError(''); setPaused(false); }
  function closeAll() { stopStream(); cleanupPreview(); setCapturedFile(null); setShowEditor(false); setSent(false); setPaused(true); }
  function togglePause() { if (paused) void startCamera(); else { stopStream(); setPaused(true); } }
  function resetAdjustments() { setFilter('natural'); setAdjustments(DEFAULT_ADJUSTMENTS); }

  async function exportEditedFile() {
    if (!capturedFile || !capturedUrl) throw new Error('Foto indisponível.');
    const image = new Image(); image.src = capturedUrl;
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Não foi possível preparar a foto.')); });
    const scale = Math.min(1, 2000 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d'); if (!context) throw new Error('Não foi possível preparar a foto.');
    context.filter = previewFilter; context.drawImage(image, 0, 0, canvas.width, canvas.height); context.filter = 'none';
    const warm = adjustments.warmth + (FILTERS.find((entry) => entry.id === filter)?.adjustments.warmth ?? 0);
    if (warm !== 0) { context.fillStyle = warm > 0 ? `rgba(225,123,132,${Math.min(Math.abs(warm)/180,0.14)})` : `rgba(120,170,205,${Math.min(Math.abs(warm)/240,0.1)})`; context.fillRect(0,0,canvas.width,canvas.height); }
    if (filter === 'mono') {
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < pixels.data.length; i += 4) { const gray = Math.round(pixels.data[i]*0.299 + pixels.data[i+1]*0.587 + pixels.data[i+2]*0.114); pixels.data[i]=gray; pixels.data[i+1]=gray; pixels.data[i+2]=gray; }
      context.putImageData(pixels, 0, 0);
    }
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.84));
    if (!blob) throw new Error('Não foi possível gerar a foto final.');
    if (blob.size <= 3_800_000) return new File([blob], `meu-look-editado-${Date.now()}.jpg`, { type: 'image/jpeg' });
    const compressed = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.68));
    if (!compressed || compressed.size > 3_800_000) throw new Error('A foto ainda ficou grande demais para envio.');
    return new File([compressed], `meu-look-editado-${Date.now()}.jpg`, { type: 'image/jpeg' });
  }

  async function sendPhoto() {
    setSending(true); setError('');
    try {
      const file = await exportEditedFile(); const form = new FormData(); form.append('image', file); form.append('filter', filter); form.append('adjustments', JSON.stringify(adjustments));
      const response = await fetch('/api/photo-email', { method: 'POST', body: form }); const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível enviar a foto.');
      setSent(true); setShowEditor(false); setCapturedFile(null); cleanupPreview();
    } catch (sendError) { setError(sendError instanceof Error ? sendError.message : 'Não foi possível enviar a foto.'); }
    finally { setSending(false); }
  }

  return <>
    <PageHeader />
    <div className="camera-page lily-page">
      <div className="lily-decoration" aria-hidden="true"><img className="lily left" src="/pink-lily.svg" alt="" /><img className="lily right" src="/pink-lily.svg" alt="" /></div>
      <div className="section-head camera-page-head"><div><p className="eyebrow">Um momento seu</p><h1 className="page-title">Tirar foto</h1><p className="page-subtitle">Registre o look de hoje, ajuste a foto do seu jeito e envie para o Rian.</p></div><span className="camera-private-note"><Sparkles size={15} /> A foto só é enviada quando você confirmar.</span></div>

      {!capturedUrl && !sent ? <section className="camera-studio card"><div className="camera-viewport"><video ref={videoRef} playsInline muted autoPlay className="camera-video" style={{ transform: facing === 'user' ? 'scaleX(-1)' : undefined }} /><div className="camera-vignette" aria-hidden="true" /><div className="camera-guide" aria-hidden="true"><span>centralize o look aqui</span></div>{starting && <div className="camera-status">Abrindo câmera…</div>}{error && <div className="camera-error">{error}</div>}<div className="camera-top-controls"><button className="camera-control" type="button" onClick={() => setFacing((value) => value === 'environment' ? 'user' : 'environment')} disabled={starting} aria-label="Trocar câmera"><FlipHorizontal size={19} /></button></div><div className="camera-bottom-controls"><button className="camera-capture" type="button" onClick={capture} disabled={starting || Boolean(error)} aria-label="Capturar foto"><span><Camera size={26} /></span></button></div></div><div className="camera-studio-footer"><div className="camera-tip"><SlidersHorizontal size={17} /><span>Depois da captura, você pode ajustar exposição, luz, contraste, cor e filtros.</span></div><button type="button" className="btn btn-ghost" onClick={togglePause}>{paused ? 'Abrir câmera' : 'Pausar câmera'}</button></div></section> : sent ? <section className="card camera-sent-state"><div className="camera-sent-mark"><Check size={28} /></div><h2 className="section-title">Foto enviada.</h2><p>Ela foi enviada para o e-mail do Rian.</p><div className="inline-actions camera-sent-actions"><button type="button" className="btn btn-primary" onClick={retake}><Camera size={17}/> Tirar outra</button><button type="button" className="btn btn-ghost" onClick={closeAll}><X size={17}/> Fechar</button></div></section> : null}

      {showEditor && capturedUrl && <Modal title="Ajustar foto" onClose={closeAll} wide><div className="photo-editor"><div className="photo-editor-preview"><img src={capturedUrl} alt="Foto capturada do look" style={{ filter: previewFilter }} /><div className="photo-editor-label">prévia</div></div><div className="photo-editor-controls"><div className="editor-section"><div className="section-head"><div><p className="eyebrow">Ajustes</p><h3 className="section-title">Luz e cor</h3></div><button type="button" className="text-link" onClick={resetAdjustments}>Restaurar</button></div><AdjustmentSlider label="Exposição" icon={<SunMedium size={16}/>} value={adjustments.exposure} min={-40} max={40} onChange={(value)=>setAdjustments((c)=>({...c,exposure:value}))}/><AdjustmentSlider label="Iluminação" icon={<SunMedium size={16}/>} value={adjustments.lighting} min={-40} max={40} onChange={(value)=>setAdjustments((c)=>({...c,lighting:value}))}/><AdjustmentSlider label="Contraste" icon={<Contrast size={16}/>} value={adjustments.contrast} min={-40} max={40} onChange={(value)=>setAdjustments((c)=>({...c,contrast:value}))}/><AdjustmentSlider label="Saturação" icon={<Sparkles size={16}/>} value={adjustments.saturation} min={-50} max={50} onChange={(value)=>setAdjustments((c)=>({...c,saturation:value}))}/><AdjustmentSlider label="Temperatura" icon={<Thermometer size={16}/>} value={adjustments.warmth} min={-50} max={50} onChange={(value)=>setAdjustments((c)=>({...c,warmth:value}))}/></div><div className="editor-section"><p className="eyebrow">Filtros</p><div className="filter-grid">{FILTERS.map((entry)=><button key={entry.id} type="button" className={`filter-chip${filter===entry.id?' active':''}`} onClick={()=>setFilter(entry.id)}><span className="filter-swatch" style={{backgroundImage:`url(${capturedUrl})`, filter:filterCss(entry.id,DEFAULT_ADJUSTMENTS)}}/><span>{entry.label}</span></button>)}</div></div>{error && <div className="card alert-card" role="alert">{error}</div>}<div className="modal-actions inline-actions editor-actions"><button type="button" className="btn btn-ghost" onClick={retake} disabled={sending}><RotateCcw size={17}/> Tirar outra</button><button type="button" className="btn btn-primary" onClick={sendPhoto} disabled={sending}><Send size={17}/> {sending?'Enviando…':'Enviar para Rian'}</button></div></div></div></Modal>}
    </div>
  </>;
}

function AdjustmentSlider({ label, icon, value, min, max, onChange }: { label:string; icon:React.ReactNode; value:number; min:number; max:number; onChange:(value:number)=>void }) {
  return <label className="adjustment-row"><span className="adjustment-label"><span className="adjustment-icon">{icon}</span>{label}<strong>{value>0?`+${value}`:value}</strong></span><input type="range" min={min} max={max} value={value} onChange={(event)=>onChange(Number(event.target.value))}/></label>;
}
