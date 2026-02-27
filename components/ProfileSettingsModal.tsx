/**
 * ProfileSettingsModal.tsx
 * Allows users to view and edit their profile stored in Firestore.
 * Fields: firstName, middleName, lastName, phone (editable); email (read-only).
 * Matches the existing neumorphic sand/sage/orange design system exactly.
 */

import React, { useState } from 'react';
import { X, Save, User, Phone, Mail, Loader2 } from 'lucide-react';
import { User as UserType } from '../types';
import { updateUserProfile } from '../services/userService';

interface Props {
    user: UserType;
    onClose: () => void;
    onSave: (updated: UserType) => void;
}

const ProfileSettingsModal: React.FC<Props> = ({ user, onClose, onSave }) => {
    const [firstName, setFirstName] = useState(user.firstName || '');
    const [middleName, setMiddleName] = useState(user.middleName || '');
    const [lastName, setLastName] = useState(user.lastName || '');
    const [phone, setPhone] = useState(user.phone || user.mobile || '');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        if (!firstName.trim()) {
            setError('First name is required.');
            return;
        }

        setIsSaving(true);
        try {
            await updateUserProfile(user.id, { firstName, middleName, lastName, phone });

            const updatedName = [firstName, middleName, lastName].filter(Boolean).join(' ');
            onSave({ ...user, firstName, middleName, lastName, phone, name: updatedName });
            setSuccess(true);
            setTimeout(() => onClose(), 1000);
        } catch (err: any) {
            setError('Failed to save. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    // Reusable field component that matches the neumorphic style
    const Field = ({
        label, value, onChange, type = 'text', readOnly = false, placeholder = ''
    }: { label: string; value: string; onChange?: (v: string) => void; type?: string; readOnly?: boolean; placeholder?: string }) => (
        <div>
            <label className="block text-xs font-bold text-[#708090] ml-1 mb-1 uppercase tracking-wide">{label}</label>
            <input
                type={type}
                value={value}
                onChange={e => onChange?.(e.target.value)}
                placeholder={placeholder}
                readOnly={readOnly}
                disabled={readOnly}
                className={`w-full p-3 rounded-xl text-[#708090] text-sm outline-none transition-all ${readOnly
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                        : 'neu-pressed focus:ring-2 focus:ring-[#8A9A5B]/40'
                    }`}
            />
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="neu-flat bg-[#E6DDD0] rounded-3xl w-full max-w-md animate-in zoom-in duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[#c4bcb1]/40">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#8A9A5B] flex items-center justify-center">
                            <User size={16} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[#708090]">Profile Settings</h2>
                            <p className="text-xs text-[#708090]/60">Manage your SPJIMR profile</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#c4bcb1]/40 transition-colors"
                    >
                        <X size={16} className="text-[#708090]" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSave} className="p-6 space-y-4">

                    {/* Name Section */}
                    <div className="space-y-3">
                        <p className="text-[10px] font-bold text-[#708090]/50 uppercase tracking-widest flex items-center gap-1.5">
                            <User size={10} /> Name
                        </p>
                        <Field label="First Name *" value={firstName} onChange={setFirstName} placeholder="e.g. Rohan" />
                        <Field label="Middle Name" value={middleName} onChange={setMiddleName} placeholder="Optional" />
                        <Field label="Last Name" value={lastName} onChange={setLastName} placeholder="e.g. Mehta" />
                    </div>

                    {/* Contact Section */}
                    <div className="space-y-3">
                        <p className="text-[10px] font-bold text-[#708090]/50 uppercase tracking-widest flex items-center gap-1.5">
                            <Phone size={10} /> Contact
                        </p>
                        <Field
                            label="Phone Number"
                            value={phone}
                            onChange={setPhone}
                            type="tel"
                            placeholder="e.g. 9876543210"
                        />
                        <div>
                            <label className="block text-xs font-bold text-[#708090] ml-1 mb-1 uppercase tracking-wide flex items-center gap-1.5">
                                <Mail size={10} /> Email
                                <span className="normal-case font-normal text-[#708090]/50 ml-1">(from Google, read-only)</span>
                            </label>
                            <Field label="" value={user.email} readOnly />
                        </div>
                    </div>

                    {/* Role badge */}
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-[#708090]/60">Role:</span>
                        <span className="px-2 py-0.5 bg-[#8A9A5B]/15 text-[#8A9A5B] rounded-full text-xs font-bold capitalize">
                            {user.role}
                        </span>
                        {user.casefileId && (
                            <span className="px-2 py-0.5 bg-[#708090]/10 text-[#708090] rounded-full text-xs font-mono">
                                {user.casefileId}
                            </span>
                        )}
                    </div>

                    {/* Error / Success */}
                    {error && (
                        <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
                    )}
                    {success && (
                        <p className="text-xs text-[#8A9A5B] bg-[#8A9A5B]/10 border border-[#8A9A5B]/30 rounded-xl px-3 py-2">
                            ✓ Profile saved successfully!
                        </p>
                    )}

                    {/* Save Button */}
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full bg-[#8A9A5B] text-white py-3.5 rounded-xl font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <><Loader2 size={16} className="animate-spin" /> Saving...</>
                        ) : (
                            <><Save size={16} /> Save Profile</>
                        )}
                    </button>
                </form>

            </div>
        </div>
    );
};

export default ProfileSettingsModal;
