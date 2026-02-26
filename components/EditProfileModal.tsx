import React, { useState } from 'react';
import { User } from '../types';

interface Props {
  user: User;
  onClose: () => void;
  onSave: (updatedDetails: Partial<User>) => void;
}

const EditProfileModal: React.FC<Props> = ({ user, onClose, onSave }) => {
  const [mobile, setMobile] = useState(user.mobile || '');
  const [likes, setLikes] = useState((user.likes || []).join(', '));
  const [dislikes, setDislikes] = useState((user.dislikes || []).join(', '));

  const handleSave = () => {
    onSave({
      mobile,
      likes: likes.split(',').map(s => s.trim()).filter(Boolean),
      dislikes: dislikes.split(',').map(s => s.trim()).filter(Boolean),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <h3 className="font-bold text-lg mb-4 text-slate-700">Complete Your Profile</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-600">Mobile Number</label>
            <input 
              type="tel" 
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="w-full mt-1 p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="e.g., +1 123 456 7890"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600">Likes</label>
            <input 
              type="text" 
              value={likes}
              onChange={(e) => setLikes(e.target.value)}
              className="w-full mt-1 p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="e.g., Reading, Hiking, Music"
            />
             <p className="text-xs text-slate-400 mt-1">Separate with commas.</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600">Dislikes</label>
            <input 
              type="text" 
              value={dislikes}
              onChange={(e) => setDislikes(e.target.value)}
              className="w-full mt-1 p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="e.g., Crowds, Spiders, Cilantro"
            />
             <p className="text-xs text-slate-400 mt-1">Separate with commas.</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-slate-500 text-sm">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">Save Changes</button>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;
