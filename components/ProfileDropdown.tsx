import React, { useState } from 'react';
import { User } from '../types';
import { ChevronDown, AlertCircle } from 'lucide-react';

interface Props {
  user: User;
  onEditProfile: () => void;
  onLogout: () => void;
}

const ProfileDropdown: React.FC<Props> = ({ user, onEditProfile, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);

  const isProfileIncomplete = !user.mobile || !user.likes || !user.dislikes || user.likes.length === 0 || user.dislikes.length === 0;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-100 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <span className="font-medium text-sm text-slate-700">{user.name}</span>
        {isProfileIncomplete && <AlertCircle size={16} className="text-yellow-500" />}
        <ChevronDown size={16} className="text-slate-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 z-50 animate-in fade-in duration-200">
          <div className="p-4 border-b border-gray-100">
            <p className="font-bold text-slate-800">{user.name}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
            {isProfileIncomplete && (
              <div className="mt-2 text-xs text-yellow-600 bg-yellow-50 p-2 rounded-md">
                Please complete your profile.
              </div>
            )}
          </div>
          <div className="p-2">
            <button onClick={onEditProfile} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-gray-50 rounded-md">Edit Profile</button>
            <button onClick={onLogout} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md">Logout</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
