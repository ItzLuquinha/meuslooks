"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Camera, Check, Contrast, FlipHorizontal, RotateCcw, Send, SlidersHorizontal, SunMedium, Thermometer } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';

type FilterName = 'natural' | 'soft' | 'rose' | 'mono' | 'warm';
type Adjustments = { exposure: number; lighting: number; contrast: number; saturation: number; warmth: number };
const DEFAULT_ADJUSTMENTS: Adjustments = { exposure: 0, lighting: 0, contrast: 0, saturation: 0, warmth: 0 };
const FILTERS: Array<{ id: FilterName; label: string; adjustments: Partial<Adjustments> }> = [
  { id: 'natural', label: 'Natural', adjustments: {} },
  { id: 'soft', label: 'Suave', adjustments: { exposure: 5, lighting: 7, contrast: -8, saturation: -4, warmth: 3 } },
  { id: 'rose', label: 'Rosé', adjustments: { exposure: 3, lighting: 6, contrast: -4, saturation: 9, warmth: 14 } },
  { id: 'mono', label: 'P&B', adjustments: { contrast: 10, saturation: -100 } },
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
  return `brightness(${(1 + exposure * 0.006 + lighting * 0.0045).toFixed(3)}) contrast(${(1 + contrast * 0.006).toFixed(3)}) saturate(${(1 + saturation * 0.007).toFixed(3)}) sepia(${clamp(Math.max(warmth, 0) * 0.0034, 0, 0.22).toFixed(3)}) hue-rotate(${clamp(warmth * -0.18, -8, 8).toFixed(2)}deg)`;
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
  const { showToast } = useToast();

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const clearCaptured = useCallback(() => {
    setCapturedUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setCapturedFile(null);
  }, []);

  const startCamera = useCallback(async () => {
    stopStream();
    setPaused(false);
    setStarting(true);
    setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } } });
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
    if (!capturedUrl && !sent && !paused) void startCamera();
    return () => stopStream();
  }, [capturedUrl, sent, paused, startCamera, stopStream]);

  const previewFilter = useMemo(() => filterCss(filter, adjustments), [filter, adjustments]);

  function capture() {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 2000 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) return;
    if (facing === 'user') { context.translate(canvas.width, 0); context.scale(-1, 1); }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `meu-look-${Date.now()}.jpg`, { type: 'image/jpeg' });
      clearCaptured();
      setCapturedFile(file);
      setCapturedUrl(URL.createObjectURL(file));
      setFilter('natural');
      setAdjustments(DEFAULT_ADJUSTMENTS);
      setShowEditor(true);
      setSent(false);
      stopStream();
    }, 'image/jpeg', 0.92);
  }

  function retake() {
    clearCaptured();
    setShowEditor(false);
    setSent(false);
    setError('');
    setPaused(false);
  }

  function closeAll() {
    stopStream();
    clearCaptured();
    setShowEditor(false);
    setSent(false);
    setPaused(true);
  }

  function togglePause() {
    if (paused) void startCamera();
    else { stopStream(); setPaused(true); }
  }

  function resetAdjustments() {
    setFilter('natural');
    setAdjustments(DEFAULT_ADJUSTMENTS);
  }

  async function exportEditedFile() {
    if (!capturedUrl) throw new Error('Foto indisponível.');
    const image = new Image();
    image.src = capturedUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Não foi possível preparar a foto.'));
    });
    const scale = Math.min(1, 2000 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível preparar a foto.');
    context.filter = previewFilter;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    context.filter = 'none';
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.84));
    if (!blob) throw new Error('Não foi possível gerar a foto final.');
    if (blob.size <= 3_800_000) return new File([blob], `meu-look-editado-${Date.now()}.jpg`, { type: 'image/jpeg' });
    const compressed = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.68));
    if (!compressed || compressed.size > 3_800_000) throw new Error('A foto ainda ficou grande demais para envio.');
    return new File([compressed], `meu-look-editado-${Date.now()}.jpg`, { type: 'image/jpeg' });
  }

  async function sendPhoto() {
    if (sending) return;
    setSending(true);
    setError('');
    try {
      const file = await exportEditedFile();
      const form = new FormData();
      form.set('photo', file);
      form.set('filter', filter);
      form.set('adjustments', JSON.stringify(adjustments));
      form.set('name', 'Minha foto');
      const response = await fetch('/api/photo-email', { method: 'POST', body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível enviar a foto.');
      setSent(true);
      setShowEditor(false);
      clearCaptured();
      showToast('Foto enviada', 'success');
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : 'Não foi possível enviar a foto.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <PageHeader />
      <div className="camera-page">
        <div className="section-head camera-page-head">
          <div>
            <h1 className="page-title">Câmera</h1>
            <p className="page-subtitle">Capture uma foto, ajuste como quiser e envie sem sair do Meu Look.</p>
          </div>
          <div className="camera-private-note">A foto editada é a mesma que será enviada.</div>
        </div>

        {sent ? (
          <section className="card camera-sent-state">
            <div className="camera-sent-mark"><Check size={30}/></div>
            <h2 className="section-title">Foto enviada</h2>
            <p>Seu arquivo editado foi encaminhado com sucesso.</p>
            <div className="inline-actions camera-sent-actions">
              <button type="button" className="btn btn-primary" onClick={retake}><Camera size={17}/>Tirar outra</button>
            </div>
          </section>
        ) : (
          <section className="card camera-studio">
            <div className="camera-viewport">
              <video ref={videoRef} className="camera-video" playsInline muted aria-label="Prévia da câmera" style={{ filter: previewFilter }}/>
              <div className="camera-vignette" aria-hidden="true" />
              <div className="camera-guide" aria-hidden="true"><span>Enquadre sua foto</span></div>
              <div className="camera-top-controls">
                <button type="button" className="camera-control" aria-label="Trocar câmera" onClick={() => setFacing((current) => current === 'environment' ? 'user' : 'environment')} disabled={starting}><FlipHorizontal size={18}/></button>
                <button type="button" className="camera-control" aria-label={paused ? 'Retomar câmera' : 'Pausar câmera'} onClick={togglePause} disabled={starting}><PauseIcon paused={paused}/></button>
              </div>
              {starting && <div className="camera-status">Abrindo câmera…</div>}
              {error && <div className="camera-error" role="alert">{error}</div>}
              <div className="camera-bottom-controls"><button type="button" className="camera-capture" aria-label="Capturar foto" onClick={capture} disabled={starting || paused}><span><Camera size={25}/></span></button></div>
            </div>
            <div className="camera-studio-footer">
              <div className="camera-tip"><SlidersHorizontal size={15}/><span>Depois da captura, você poderá escolher filtros e ajustar exposição, iluminação, contraste, saturação e temperatura.</span></div>
              <button type="button" className="btn btn-ghost" onClick={closeAll}>Fechar câmera</button>
            </div>
          </section>
        )}
      </div>

      {showEditor && capturedUrl && (
        <Modal title="Editar foto" onClose={() => { if (!sending) retake(); }} wide>
          <div className="photo-editor">
            <div className="photo-editor-preview">
              <img src={capturedUrl} alt="Prévia da foto capturada" style={{ filter: previewFilter }}/>
              <span className="photo-editor-label">Prévia final</span>
            </div>
            <div className="photo-editor-controls">
              <section className="editor-section">
                <div className="section-head"><div><h3 className="section-title">Filtros</h3><p className="page-subtitle">Escolha uma base e ajuste depois.</p></div></div>
                <div className="filter-grid">
                  {FILTERS.map((entry) => <button type="button" key={entry.id} className={`filter-chip ${filter === entry.id ? 'active' : ''}`} onClick={() => setFilter(entry.id)}><span className="filter-swatch" style={{ backgroundImage: `url(${capturedUrl})`, filter: filterCss(entry.id, DEFAULT_ADJUSTMENTS) }}/><span>{entry.label}</span></button>)}
                </div>
              </section>
              <section className="editor-section">
                <div className="section-head"><div><h3 className="section-title">Ajustes</h3></div><button type="button" className="btn btn-ghost" onClick={resetAdjustments}><RotateCcw size={14}/>Resetar</button></div>
                <Adjustment label="Exposição" icon={<SunMedium size={16}/>} value={adjustments.exposure} onChange={(value) => setAdjustments((current) => ({ ...current, exposure: value }))}/>
                <Adjustment label="Iluminação" icon={<SunMedium size={16}/>} value={adjustments.lighting} onChange={(value) => setAdjustments((current) => ({ ...current, lighting: value }))}/>
                <Adjustment label="Contraste" icon={<Contrast size={16}/>} value={adjustments.contrast} onChange={(value) => setAdjustments((current) => ({ ...current, contrast: value }))}/>
                <Adjustment label="Saturação" icon={<SlidersHorizontal size={16}/>} value={adjustments.saturation} onChange={(value) => setAdjustments((current) => ({ ...current, saturation: value }))}/>
                <Adjustment label="Temperatura" icon={<Thermometer size={16}/>} value={adjustments.warmth} onChange={(value) => setAdjustments((current) => ({ ...current, warmth: value }))}/>
              </section>
              {error && <div className="inline-message" role="alert">{error}</div>}
              <div className="inline-actions editor-actions">
                <button type="button" className="btn btn-ghost" onClick={retake} disabled={sending}><RotateCcw size={15}/>Tirar outra</button>
                <button type="button" className="btn btn-primary" onClick={() => void sendPhoto()} disabled={sending}><Send size={15}/>{sending ? 'Enviando…' : 'Enviar foto'}</button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function PauseIcon({ paused }: { paused: boolean }) {
  return paused ? <span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1 }}>▶</span> : <span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1 }}>Ⅱ</span>;
}

function Adjustment({ label, icon, value, onChange }: { label: string; icon: ReactNode; value: number; onChange: (value: number) => void }) {
  return <label className="adjustment-row"><span className="adjustment-label"><span className="adjustment-icon">{icon}</span>{label}<strong>{value > 0 ? `+${value}` : value}</strong></span><input type="range" min={-100} max={100} value={value} onChange={(event) => onChange(Number(event.target.value))}/></label>;
}
