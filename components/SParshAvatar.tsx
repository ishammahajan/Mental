import React from 'react';
import { useSParsh } from '../contexts/SParshContext';

const SParshAvatar: React.FC = () => {
  const { avatarState: state, vibe: mood } = useSParsh();

  // Determine mood class
  let moodClass = '';
  let glowClass = 'bg-[#8a6b5c]'; // Default sage glow
  
  if (mood === 'anxious') {
    moodClass = 'mood-anxious';
    glowClass = 'bg-[#8a7b63]';
  } else if (mood === 'focus') {
    moodClass = 'mood-focus';
    glowClass = 'bg-[#5b5350]';
  } else if (mood === 'tired') {
    moodClass = 'mood-tired';
    glowClass = 'bg-[#7c7470]';
  } else if (mood === 'energetic') {
    moodClass = 'mood-energetic';
    glowClass = 'bg-[#dccfc4]';
  } else if (mood === 'calm') {
    moodClass = ''; // Default
    glowClass = 'bg-[#8a6b5c]';
  }

  // Determine Outer Glow
  // If listening, standard orange glow. If speaking/idle, use mood glow.
  const finalGlow = state === 'listening' ? 'bg-orange-400' : glowClass;
  
  // Determine Blob Class
  // If listening, override mood with standard listening state
  // If speaking or idle, show mood. Add 'speaking' class if speaking.
  // Note: We combine them so mood colors persist during speech.
  let blobClass = '';
  if (state === 'listening') {
    blobClass = 'listening';
  } else {
    // Apply mood class. If speaking, also add 'speaking'.
    blobClass = `${moodClass} ${state === 'speaking' ? 'speaking' : ''}`.trim();
  }

  return (
    <div className="relative flex items-center justify-center w-64 h-64 mx-auto my-8">
      {/* Outer Glow */}
      <div className={`absolute w-full h-full rounded-full opacity-20 blur-2xl transition-colors duration-1000 ${finalGlow}`} 
      />
      
      {/* The Blob */}
      <div 
        className={`sparsh-blob w-48 h-48 rounded-full transition-all duration-1000 ${blobClass}`}
      />
      
      {/* Glass overlay for texture */}
      <div className="absolute w-48 h-48 rounded-full bg-white opacity-10 backdrop-blur-sm pointer-events-none mix-blend-overlay" />
    </div>
  );
};

export default SParshAvatar;


