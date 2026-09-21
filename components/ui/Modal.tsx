"use client";
import { ReactNode } from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className={`card modal${wide ? ' modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="section-head">
          <h2 id="modal-title" className="section-title">{title}</h2>
          <button type="button" className="icon-btn" aria-label="Fechar" onClick={onClose}><X size={18}/></button>
        </div>
        {children}
      </section>
    </div>
  );
}
