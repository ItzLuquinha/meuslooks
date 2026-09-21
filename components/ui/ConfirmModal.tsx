"use client";
import Modal from './Modal';

export default function ConfirmModal({ title, message, confirmLabel = 'Confirmar', onConfirm, onCancel, busy = false }: { title: string; message: string; confirmLabel?: string; onConfirm: () => void; onCancel: () => void; busy?: boolean }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="card-copy">{message}</p>
      <div className="inline-actions modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>Cancelar</button>
        <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>{busy ? 'Aguarde…' : confirmLabel}</button>
      </div>
    </Modal>
  );
}
