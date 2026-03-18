import React from 'react';
import { Phone, XCircle, MapPin } from 'lucide-react';

interface CrisisOverlayProps {
  onDismiss: () => void; // Only for demo purposes, usually strictly controlled
}

const CrisisOverlay: React.FC<CrisisOverlayProps> = ({ onDismiss }) => {
  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-bg)] bg-opacity-95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-[var(--color-error)] animate-in fade-in zoom-in duration-300">
      
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-4 text-[var(--color-text)]">We are here with you.</h1>
        <p className="text-[var(--color-text-secondary)] text-lg">You don't have to carry this alone.</p>
      </div>

      <div className="w-full max-w-md space-y-4">
        <a href="tel:9820519373" className="block">
          <div className="neu-flat p-6 rounded-2xl flex items-center gap-4 active:scale-95 transition-transform border border-[var(--border-subtle)]">
            <div className="p-3 bg-[var(--color-primary)] text-white rounded-full">
              <Phone size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[var(--color-text)]">Call Dimple Wagle</h3>
              <p className="text-sm text-[var(--color-text-secondary)]">Campus Psychologist</p>
            </div>
          </div>
        </a>

        <a href="tel:9152987823" className="block">
          <div className="neu-flat p-6 rounded-2xl flex items-center gap-4 active:scale-95 transition-transform border border-[var(--border-subtle)]">
            <div className="p-3 bg-[var(--color-error)] text-white rounded-full">
              <Phone size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[var(--color-text)]">Call iCALL</h3>
              <p className="text-sm text-[var(--color-text-secondary)]">Available Monday to Friday only</p>
            </div>
          </div>
        </a>
        
        <div className="neu-flat p-6 rounded-2xl flex items-center gap-4 border border-[var(--border-subtle)]">
           <div className="p-3 bg-[var(--color-primary-strong)] text-white rounded-full">
              <MapPin size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[var(--color-text)]">Dr. Jyoti Sangle</h3>
              <p className="text-sm text-[var(--color-text-secondary)]">Health Center • Block A</p>
            </div>
        </div>
      </div>

      <button 
        onClick={onDismiss}
        className="mt-12 text-[var(--color-text-secondary)] text-sm flex items-center gap-2 hover:text-[var(--color-error)] transition-colors"
      >
        <XCircle size={16} />
        I am safe now, return to app
      </button>
    </div>
  );
};

export default CrisisOverlay;






