import React from 'react';
import { Phone, XCircle, MapPin } from 'lucide-react';

interface CrisisOverlayProps {
  onDismiss: () => void; // Only for demo purposes, usually strictly controlled
}

const CrisisOverlay: React.FC<CrisisOverlayProps> = ({ onDismiss }) => {
  return (
    <div className="fixed inset-0 z-[300] bg-black/55 flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[var(--border-subtle)] overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-5 bg-[var(--color-primary-soft)] border-b border-[var(--border-subtle)] text-center">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">We are here with you.</h1>
          <p className="text-[var(--color-text-secondary)] text-sm mt-1">You don't have to carry this alone.</p>
        </div>

        <div className="p-5 space-y-3 bg-white">
          <a href="tel:9820519373" className="block">
            <div className="neu-flat p-4 rounded-2xl flex items-center gap-3 active:scale-95 transition-transform border border-[var(--border-subtle)]">
              <div className="p-2.5 bg-[var(--color-primary)] text-white rounded-full">
                <Phone size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--color-text)]">Call Dimple Wagle</h3>
                <p className="text-xs text-[var(--color-text-secondary)]">Campus Psychologist</p>
              </div>
            </div>
          </a>

          <a href="tel:9152987823" className="block">
            <div className="neu-flat p-4 rounded-2xl flex items-center gap-3 active:scale-95 transition-transform border border-[var(--border-subtle)]">
              <div className="p-2.5 bg-[var(--color-error)] text-white rounded-full">
                <Phone size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--color-text)]">Call iCALL</h3>
                <p className="text-xs text-[var(--color-text-secondary)]">Available Monday to Friday only</p>
              </div>
            </div>
          </a>

          <div className="neu-flat p-4 rounded-2xl flex items-center gap-3 border border-[var(--border-subtle)]">
            <div className="p-2.5 bg-[var(--color-primary-strong)] text-white rounded-full">
              <MapPin size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--color-text)]">Dr. Jyoti Sangle</h3>
              <p className="text-xs text-[var(--color-text-secondary)]">Health Center • Block A</p>
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 pt-1 flex justify-center bg-white">
          <button
            onClick={onDismiss}
            className="text-[var(--color-text-secondary)] text-sm flex items-center gap-2 hover:text-[var(--color-error)] transition-colors"
          >
            <XCircle size={16} />
            I am safe now, return to app
          </button>
        </div>
      </div>
    </div>
  );
};

export default CrisisOverlay;






