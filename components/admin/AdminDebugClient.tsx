"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock3, Gauge, Smartphone, Trash2, Wifi, X } from 'lucide-react';

type DebugRecord = {
  id: string;
  kind: 'page' | 'api' | 'interaction' | 'error' | 'metric' | 'resource' | 'network';
  timestamp: number;
  path: string;
  data: Record<string, string | number | boolean | null>;
};

type Device = {
  id: string;
  name: string;
  brand: 'Apple' | 'Samsung' | 'Google' | 'Motorola';
  width: number;
  height: number;
  dpr: number;
};

const DEVICES: Device[] = [
  { id: 'iphone-se-3', name: 'iPhone SE (3ª)', brand: 'Apple', width: 375, height: 667, dpr: 2 },
  { id: 'iphone-12-mini', name: 'iPhone 12 mini', brand: 'Apple', width: 360, height: 780, dpr: 3 },
  { id: 'iphone-12', name: 'iPhone 12', brand: 'Apple', width: 390, height: 844, dpr: 3 },
  { id: 'iphone-12-pro-max', name: 'iPhone 12 Pro Max', brand: 'Apple', width: 428, height: 926, dpr: 3 },
  { id: 'iphone-13', name: 'iPhone 13', brand: 'Apple', width: 390, height: 844, dpr: 3 },
  { id: 'iphone-14-pro-max', name: 'iPhone 14 Pro Max', brand: 'Apple', width: 430, height: 932, dpr: 3 },
  { id: 'iphone-15', name: 'iPhone 15', brand: 'Apple', width: 393, height: 852, dpr: 3 },
  { id: 'iphone-16-pro-max', name: 'iPhone 16 Pro Max', brand: 'Apple', width: 440, height: 956, dpr: 3 },
  { id: 'galaxy-s21', name: 'Galaxy S21', brand: 'Samsung', width: 360, height: 800, dpr: 3 },
  { id: 'galaxy-s23', name: 'Galaxy S23', brand: 'Samsung', width: 360, height: 780, dpr: 3 },
  { id: 'galaxy-s24-ultra', name: 'Galaxy S24 Ultra', brand: 'Samsung', width: 412, height: 915, dpr: 3 },
  { id: 'galaxy-s25-ultra', name: 'Galaxy S25 Ultra', brand: 'Samsung', width: 412, height: 915, dpr: 3 },
  { id: 'pixel-8', name: 'Pixel 8', brand: 'Google', width: 412, height: 915, dpr: 2.75 },
  { id: 'pixel-9-pro-xl', name: 'Pixel 9 Pro XL', brand: 'Google', width: 448, height: 992, dpr: 3 },
  { id: 'moto-g-power', name: 'Moto G Power', brand: 'Motorola', width: 412, height: 915, dpr: 2.625 },
];

const PREVIEW_PAGES = [
  ['/inicio', 'Início'],
  ['/guarda-roupa', 'Guarda-Roupa'],
  ['/favoritos', 'Favoritos'],
  ['/calendario', 'Calendário'],
  ['/estatisticas', 'Estatísticas'],
  ['/configuracoes', 'Configurações'],
  ['/look-do-dia', 'Look do Dia'],
] as const;

function loadRecords(): DebugRecord[] {
  try {
    const raw = window.localStorage.getItem('meu_look_debug_records');
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { records?: DebugRecord[] };
    return Array.isArray(parsed.records) ? parsed.records : [];
  } catch {
    return [];
  }
}

function formatMs(value: number | null) {
  if (value === null || Number.isNaN(value)) return '—';
  return `${value.toFixed(value >= 100 ? 0 : 1)} ms`;
}

function labelForRecord(record: DebugRecord) {
  if (record.kind === 'interaction') return String(record.data.label || 'Interação');
  if (record.kind === 'api') return `${String(record.data.method || 'GET')} ${String(record.data.url || '')}`;
  if (record.kind === 'page') return record.path;
  if (record.kind === 'error') return String(record.data.message || 'Erro');
  return String(record.data.metric || record.data.type || record.kind);
}

function PreviewContent({ page }: { page: string }) {
  const clothes = ['Vestido floral', 'Blusa rosé', 'Saia preta', 'Jaqueta jeans', 'Calça clara', 'Bolsa vinho'];
  const summary = page === '/estatisticas';
  const favorite = page === '/favoritos';
  const calendar = page === '/calendario';
  const settings = page === '/configuracoes';
  const look = page === '/look-do-dia';

  return <div className="page-shell debug-preview-shell"><div className="debug-preview-topbar"><div className="mobile-brand"><img src="/pink-lily.svg" alt="" className="mobile-brand-lily"/><span>Meu Look</span></div><button className="icon-btn" aria-label="Sair"><X size={17}/></button></div><div className="debug-preview-content">
    <div className="debug-preview-lily" aria-hidden="true"><img src="/pink-lily.svg" alt=""/></div>
    <span className="card-kicker">Meu Look</span>
    <h1 className="page-title">{PREVIEW_PAGES.find(([href]) => href === page)?.[1] || 'Meu Look'}</h1>
    <p className="page-subtitle">Uma prévia visual responsiva com os componentes e espaçamentos do aplicativo.</p>

    {page === '/inicio' && <>
      <section className="section home-main-section"><div className="card home-day-look"><div className="section-head"><div><span className="card-kicker">Hoje</span><h2 className="card-title">Look do Dia</h2><p className="page-subtitle">Sua composição escolhida para hoje.</p></div><span className="text-link">Visualizar</span></div><div className="outfit-preview home-day-preview">{clothes.slice(0,4).map((name, i) => <div key={name} className="debug-preview-piece"><div className={`debug-fabric debug-fabric-${i}`}/><span>{name}</span></div>)}</div></div><div className="home-quick-actions"><button className="quick-action"><span><Activity size={18}/></span><div><strong>Adicionar peça</strong><small>Atualize seu guarda-roupa</small></div></button><button className="quick-action"><span><Gauge size={18}/></span><div><strong>Montar look</strong><small>Crie uma nova composição</small></div></button></div></section>
      <section className="section home-summary-row"><div><strong>47</strong><span>peças</span></div><div><strong>18</strong><span>looks</span></div><div><strong>12</strong><span>favoritas</span></div><div><strong>9</strong><span>esperando sua vez</span></div></section>
      <section className="section home-content-grid"><div className="card home-list-panel"><div className="section-head"><div><h2 className="section-title">Usados recentemente</h2></div></div>{clothes.slice(0,3).map((name) => <div key={name} className="home-piece-row"><div className="home-piece-thumb"><div className="debug-thumb"/></div><div><strong>{name}</strong><span>Peça</span></div><Clock3 size={15}/></div>)}</div><div className="card home-list-panel"><div className="section-head"><div><h2 className="section-title">Esperando sua vez</h2></div></div>{clothes.slice(3,6).map((name) => <div key={name} className="home-piece-row"><div className="home-piece-thumb"><div className="debug-thumb"/></div><div><strong>{name}</strong><span>Peça</span></div><HeartIcon/></div>)}</div></section>
    </>}

    {page === '/guarda-roupa' && <><div className="category-filter-row"><button className="btn btn-soft">Todas</button><button className="btn btn-ghost">Vestidos</button><button className="btn btn-ghost">Blusas</button><button className="btn btn-ghost">Calças</button></div><div className="grid debug-preview-grid">{clothes.map((name, i) => <article className="card clothing-card" key={name}><div className="clothing-image"><div className={`debug-fabric debug-fabric-${i}`}/></div><div className="clothing-info"><strong>{name}</strong><span>Categoria</span></div></article>)}</div></>}

    {favorite && <><div className="debug-preview-tabline"><span className="active">Peças favoritas</span><span>Looks favoritos</span></div><div className="grid debug-preview-grid">{clothes.slice(0,4).map((name, i) => <article className="card clothing-card" key={name}><div className="clothing-image"><div className={`debug-fabric debug-fabric-${i}`}/><button className="favorite-btn" aria-label={`Remover ${name} dos favoritos`}>♥</button></div><div className="clothing-info"><strong>{name}</strong><span>Favorita</span></div></article>)}</div></>}

    {calendar && <div className="card debug-calendar-preview"><div className="section-head"><div><span className="card-kicker">Setembro 2026</span><h2 className="card-title">Calendário</h2></div><div className="inline-actions"><button className="icon-btn" aria-label="Mês anterior">‹</button><button className="icon-btn" aria-label="Próximo mês">›</button></div></div><div className="calendar-weekdays">{['D','S','T','Q','Q','S','S'].map((day, i) => <span key={`${day}-${i}`}>{day}</span>)}</div><div className="calendar-grid">{Array.from({ length: 35 }, (_, i) => <div key={i} className={`calendar-cell ${[5,11,18,25].includes(i) ? 'has-entry' : ''}`}><span>{i + 1}</span>{[5,11,18,25].includes(i) && <small>Look</small>}</div>)}</div></div>}

    {summary && <><section className="stats-cards"><div className="card stat-card"><div className="stat-label">Peças</div><div className="stat-value">47</div></div><div className="card stat-card"><div className="stat-label">Looks</div><div className="stat-value">18</div></div><div className="card stat-card"><div className="stat-label">Favoritas</div><div className="stat-value">12</div></div><div className="card stat-card"><div className="stat-label">Dias registrados</div><div className="stat-value">16</div></div></section><section className="section stats-grid"><div className="card stats-panel"><div className="section-head"><div><h2 className="section-title">Mais usadas</h2></div></div>{clothes.slice(0,4).map((name, i) => <div className="usage-row" key={name}><div className="home-piece-thumb"><div className={`debug-thumb debug-thumb-${i}`}/></div><div><strong>{name}</strong><span>{i + 1} usos</span></div></div>)}</div><div className="card stats-panel"><div className="section-head"><div><h2 className="section-title">Peças pouco usadas</h2></div></div>{clothes.slice(3).map((name, i) => <div className="usage-row" key={name}><div><strong>{name}</strong><span>{i % 2 === 0 ? '1 uso' : '2 usos'}</span></div></div>)}</div></section></>}

    {settings && <section className="section"><div className="card form-card"><h2 className="section-title">Sua conta</h2><div className="form-grid"><div className="field"><label className="label">Nome</label><div className="input">Lívia</div></div><div className="field"><label className="label">E-mail</label><div className="input">livia@example.com</div></div><div className="field full"><label className="label">Preferências</label><div className="check-row">Notificações suaves e lembretes</div></div></div></div></section>}

    {look && <section className="section"><div className="card day-look-card"><div className="section-head"><div><span className="card-kicker">Escolhido</span><h2 className="card-title">Domingo tranquilo</h2><p className="page-subtitle">Passeio · confortável</p></div><button className="favorite-btn" aria-label="Favoritar look">♥</button></div><div className="outfit-preview day-look-preview">{clothes.slice(0,3).map((name, i) => <div className="debug-preview-piece" key={name}><div className={`debug-fabric debug-fabric-${i}`}/><span>{name}</span></div>)}</div></div></section>}

    <section className="section"><div className="card form-card"><strong>Prévia responsiva</strong><p className="page-subtitle">Esta simulação usa os mesmos estilos globais para você analisar espaçamento, quebras e tamanhos em diferentes larguras.</p><button className="btn btn-primary">Botão de teste</button></div></section>
  </div></div>;
}

function HeartIcon() { return <span className="debug-heart" aria-hidden="true">♥</span>; }
function CopyIcon() { return <span aria-hidden="true" style={{ fontSize: 15 }}>⧉</span>; }

export default function AdminDebugClient() {
  const [records, setRecords] = useState<DebugRecord[]>([]);
  const [deviceId, setDeviceId] = useState('iphone-12');
  const [page, setPage] = useState('/inicio');
  const [landscape, setLandscape] = useState(false);
  const [safeArea, setSafeArea] = useState(true);
  const [tab, setTab] = useState<'overview' | 'pages' | 'interactions' | 'api' | 'checks' | 'motion'>('overview');
  const [tick, setTick] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const refresh = useCallback(() => setRecords(loadRecords()), []);

  useEffect(() => {
    try { window.localStorage.setItem('meu_look_debug', '1'); } catch {}
    window.dispatchEvent(new Event('meu-look-debug-toggle'));
    refresh();
    const timer = window.setInterval(() => { refresh(); setTick((value) => value + 1); }, 900);
    const onRecord = () => refresh();
    window.addEventListener('meu-look-debug-record', onRecord);
    return () => { window.clearInterval(timer); window.removeEventListener('meu-look-debug-record', onRecord); };
  }, [refresh]);

  const clearRecords = () => {
    try { window.localStorage.removeItem('meu_look_debug_records'); } catch {}
    refresh();
  };

  const copyDiagnostics = async () => {
    const lines = [
      'Meu Look · Debug',
      `Registros: ${records.length}`,
      `Páginas: ${pages.length}`,
      `Interações: ${interactions.length}`,
      `APIs: ${apis.length}`,
      `Erros JS: ${errors.length}`,
      `API média: ${formatMs(avgApi || null)}`,
      `Resposta média: ${formatMs(avgInteraction || null)}`,
      `Última página: ${lastPage?.path || '—'} · ${lastPage ? formatMs(Number(lastPage.data.total_ms || 0)) : '—'}`,
    ].join('\n');
    try { await navigator.clipboard.writeText(lines); } catch {}
  };

  const device = DEVICES.find((item) => item.id === deviceId) || DEVICES[2];
  const frameWidth = landscape ? device.height : device.width;
  const frameHeight = landscape ? device.width : device.height;

  const pages = records.filter((record) => record.kind === 'page');
  const interactions = records.filter((record) => record.kind === 'interaction' && record.data.status !== 'started');
  const apis = records.filter((record) => record.kind === 'api');
  const errors = records.filter((record) => record.kind === 'error');
  const metrics = records.filter((record) => record.kind === 'metric');
  const slowApis = useMemo(() => [...apis].sort((a, b) => Number(b.data.duration_ms || 0) - Number(a.data.duration_ms || 0)).slice(0, 10), [apis]);

  const avgApi = apis.length ? apis.reduce((sum, record) => sum + Number(record.data.duration_ms || 0), 0) / apis.length : 0;
  const avgInteraction = interactions.length ? interactions.reduce((sum, record) => sum + Number(record.data.ui_ms || 0), 0) / interactions.length : 0;
  const lastPage = pages.at(-1);
  const latestNetwork = records.filter((record) => record.kind === 'network').at(-1);
  const lcp = [...metrics].filter((record) => record.data.metric === 'lcp_ms').at(-1);

  const runPreviewCheck = () => {
    const frame = iframeRef.current;
    const doc = frame?.contentDocument;
    if (!doc || !frame) return;
    const body = doc.body;
    const overflow = body.scrollWidth > body.clientWidth + 1 || doc.documentElement.scrollWidth > doc.documentElement.clientWidth + 1;
    const actionable = Array.from(doc.querySelectorAll('button, a, input, select, textarea, [role="button"]'));
    const tooSmall = actionable.filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && (rect.width < 42 || rect.height < 42);
    });
    const missingAlt = Array.from(doc.images).filter((image) => !image.hasAttribute('alt')).length;
    const status = { overflow, small_targets: tooSmall.length, missing_alt: missingAlt, focusable: actionable.length, width: body.clientWidth, height: body.scrollHeight };
    try { window.localStorage.setItem('meu_look_debug_preview_checks', JSON.stringify(status)); } catch {}
    setTick((value) => value + 1);
  };

  const previewChecks = (() => {
    try {
      const raw = window.localStorage.getItem('meu_look_debug_preview_checks');
      return raw ? JSON.parse(raw) as { overflow?: boolean; small_targets?: number; missing_alt?: number; focusable?: number; width?: number; height?: number } : null;
    } catch { return null; }
  })();

  const iframeSrc = `/admin-preview?page=${encodeURIComponent(page)}`;

  return <>
    <div className="debug-header-row"><div><h1 className="page-title">Debug</h1><p className="page-subtitle">Ferramentas internas para testar responsividade, animações e performance.</p></div><div className="inline-actions"><button className="btn btn-ghost" onClick={refresh}><Activity size={16}/>Atualizar</button><button className="btn btn-ghost" onClick={() => void copyDiagnostics()}><CopyIcon/>Copiar diagnóstico</button><button className="btn btn-danger" onClick={clearRecords}><Trash2 size={16}/>Limpar métricas</button></div></div>

    <div className="debug-tabs" role="tablist" aria-label="Ferramentas de debug">{[['overview','Visão geral'],['pages','Páginas'],['interactions','Botões'],['api','APIs'],['checks','Layout'],['motion','Movimento']].map(([id,label]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id as typeof tab)}>{label}</button>)}</div>

    {tab === 'overview' && <section className="debug-grid"><div className="card debug-metric-card"><span className="card-kicker">Resposta média</span><strong>{formatMs(avgInteraction || null)}</strong><small>interface após toque/clique</small></div><div className="card debug-metric-card"><span className="card-kicker">API média</span><strong>{formatMs(avgApi || null)}</strong><small>fetches registrados</small></div><div className="card debug-metric-card"><span className="card-kicker">Última página</span><strong>{lastPage ? formatMs(Number(lastPage.data.total_ms || 0)) : '—'}</strong><small>{lastPage?.path || 'Nenhum registro ainda'}</small></div><div className="card debug-metric-card"><span className="card-kicker">Erros JS</span><strong>{errors.length}</strong><small>{errors.length ? 'Revisar abaixo' : 'Nenhum erro capturado'}</small></div></section>}

    {tab === 'overview' && <section className="section debug-grid-2"><div className="card debug-panel"><div className="section-head"><div><h2 className="section-title">Saúde da sessão</h2><p className="page-subtitle">Sinais úteis capturados sem enviar dados para fora do navegador.</p></div><CheckCircle2 size={19}/></div><div className="debug-status-list"><div><span>Conexão</span><strong>{latestNetwork?.data.online === false ? 'Offline' : 'Online'}</strong></div><div><span>Viewport atual</span><strong>{latestNetwork?.data.viewport_width ? `${latestNetwork.data.viewport_width} × ${latestNetwork.data.viewport_height}` : '—'}</strong></div><div><span>FCP / LCP</span><strong>{lcp ? formatMs(Number(lcp.data.value_ms || 0)) : 'aguardando'}</strong></div><div><span>Métricas</span><strong>{records.length}</strong></div></div></div><div className="card debug-panel"><div className="section-head"><div><h2 className="section-title">APIs lentas</h2><p className="page-subtitle">Últimas requisições com maior duração.</p></div><Wifi size={19}/></div>{slowApis.length ? slowApis.slice(0,5).map((record) => <div className="debug-row" key={record.id}><div><strong>{String(record.data.method || 'GET')} {String(record.data.url || '')}</strong><span>{record.path}</span></div><strong>{formatMs(Number(record.data.duration_ms || 0))}</strong></div>) : <div className="empty">Ainda não há chamadas registradas.</div>}</div></section>}

    {tab === 'pages' && <section className="card debug-panel"><div className="section-head"><div><h2 className="section-title">Tempo por página</h2><p className="page-subtitle">Medição das navegações observadas pelo monitor.</p></div><Clock3 size={19}/></div>{pages.length ? pages.slice(-30).reverse().map((record) => <div className="debug-row" key={record.id}><div><strong>{record.path}</strong><span>{String(record.data.mode || 'navegação')}</span></div><strong>{formatMs(Number(record.data.total_ms || 0))}</strong></div>) : <div className="empty">Navegue pelo site enquanto o monitoramento estiver ativo.</div>}</section>}

    {tab === 'interactions' && <section className="card debug-panel"><div className="section-head"><div><h2 className="section-title">Tempo por botão</h2><p className="page-subtitle">Resposta visual do clique/toque. Quando houver fetch próximo ao clique, ele aparece na aba APIs.</p></div><Gauge size={19}/></div>{interactions.length ? interactions.slice(-40).reverse().map((record) => <div className="debug-row" key={record.id}><div><strong>{String(record.data.label || 'Interação')}</strong><span>{record.path} · {String(record.data.element || '')}</span></div><strong>{formatMs(Number(record.data.ui_ms || 0))}</strong></div>) : <div className="empty">Clique nos botões do aplicativo enquanto o monitor estiver ativo.</div>}</section>}

    {tab === 'api' && <section className="card debug-panel"><div className="section-head"><div><h2 className="section-title">Performance das APIs</h2><p className="page-subtitle">Tempo real de cada request observada pelo cliente.</p></div><Activity size={19}/></div>{apis.length ? apis.slice(-60).reverse().map((record) => <div className="debug-row" key={record.id}><div><strong>{String(record.data.method || 'GET')} {String(record.data.url || '')}</strong><span>{record.path} · HTTP {String(record.data.status || 0)}{record.data.interaction_id ? ' · acionado por botão' : ''}</span></div><strong>{formatMs(Number(record.data.duration_ms || 0))}</strong></div>) : <div className="empty">Nenhuma API registrada ainda.</div>}</section>}

    {tab === 'checks' && <section className="debug-grid-2"><div className="card debug-panel"><div className="section-head"><div><h2 className="section-title">Verificador do preview</h2><p className="page-subtitle">Checa overflow horizontal, área de toque e imagens sem alt no dispositivo selecionado.</p></div><CheckCircle2 size={19}/></div><button className="btn btn-primary" onClick={runPreviewCheck}>Rodar verificação</button>{previewChecks && <div className="debug-status-list" style={{marginTop:16}}><div><span>Overflow horizontal</span><strong>{previewChecks.overflow ? 'Encontrado' : 'OK'}</strong></div><div><span>Toques pequenos</span><strong>{previewChecks.small_targets ?? 0}</strong></div><div><span>Imagens sem alt</span><strong>{previewChecks.missing_alt ?? 0}</strong></div><div><span>Elementos interativos</span><strong>{previewChecks.focusable ?? 0}</strong></div></div>}</div><div className="card debug-panel"><div className="section-head"><div><h2 className="section-title">Erros capturados</h2><p className="page-subtitle">Exceções JS e rejeições não tratadas.</p></div><AlertTriangle size={19}/></div>{errors.length ? errors.slice(-20).reverse().map((record) => <div className="debug-error-row" key={record.id}><strong>{labelForRecord(record)}</strong><span>{record.path}</span></div>) : <div className="empty">Nenhum erro capturado.</div>}</div></section>}

    {tab === 'motion' && <section className="card debug-panel"><div className="section-head"><div><h2 className="section-title">Laboratório de movimento</h2><p className="page-subtitle">Use estes controles para verificar visualmente as microinterações sem sair do painel.</p></div><Activity size={19}/></div><div className="debug-motion-lab"><button className="btn btn-primary debug-motion-button">Pressione</button><button className="favorite-btn favorite-btn-pulse" aria-label="Testar favorito">♥</button><button className="btn btn-soft debug-motion-fade">Testar fade</button><div className="debug-motion-swatch">Crossfade <span>200ms</span></div></div></section>}

    <section className="section"><div className="card debug-device-panel"><div className="section-head"><div><span className="card-kicker">Visualizador responsivo</span><h2 className="section-title">Como o site se comporta</h2><p className="page-subtitle">Escolha um aparelho e navegue pela prévia sem depender do DevTools.</p></div><Smartphone size={20}/></div><div className="debug-device-controls"><select className="select" value={deviceId} onChange={(event) => setDeviceId(event.target.value)}>{DEVICES.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.width}×{item.height}</option>)}</select><select className="select" value={page} onChange={(event) => setPage(event.target.value)}>{PREVIEW_PAGES.map(([href,label]) => <option key={href} value={href}>{label}</option>)}</select><button className="btn btn-ghost" onClick={() => setLandscape((value) => !value)}>{landscape ? 'Retrato' : 'Paisagem'}</button><button className={`btn ${safeArea ? 'btn-soft' : 'btn-ghost'}`} onClick={() => setSafeArea((value) => !value)}>Safe area</button></div><div className="debug-device-meta"><span>{device.brand} · {device.width}×{device.height} · DPR {device.dpr}</span><span>Viewport em 100%</span></div><div className="debug-device-stage"><div className={`debug-device-frame ${landscape ? 'landscape' : ''}`} style={{ width: frameWidth, height: frameHeight }}><div className="debug-device-top"><span>9:41</span><span>•••</span></div><iframe key={`${deviceId}-${landscape}-${page}`} ref={iframeRef} title={`Prévia ${device.name}`} src={iframeSrc} style={{ width: frameWidth, height: Math.max(0, frameHeight - 28) }} /><div className={`debug-device-home ${safeArea ? 'with-safe-area' : ''}`}/></div></div><div className="debug-device-tip">Dica: teste 360px, 390px, 412px e 430px para pegar os problemas mais comuns de mobile.</div></div></section>
  </>;
}
