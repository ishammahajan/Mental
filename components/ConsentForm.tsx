import React, { useState, useRef } from 'react';
import { Role, User } from '../types';

interface ConsentFormProps {
  role: Role;
  studentName: string;
  program: string;
  onClose: () => void;
  onSubmit: (signature: string | File, mobile?: string) => void;
  user?: User;
}

const ConsentForm: React.FC<ConsentFormProps> = ({ role, studentName, program, onClose, onSubmit, user }) => {
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [signature, setSignature] = useState<string | File>('');
  const [error, setError] = useState('');
  const [signaturePreview, setSignaturePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 1024 * 1024) { // 1MB limit
        setError('File size must be less than 1MB.');
        return;
      }
      setError('');
      setSignature(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setSignaturePreview(ev.target?.result as string);
      }
      reader.readAsDataURL(file);
    }
  };

      const handleSubmit = () => {
    if (role === 'student' && !mobile.trim()) {
      setError('Mobile number is required.');
      return;
    }
    if (!signature) {
      setError('Signature is required to proceed.');
      return;
    }
    onSubmit(signature, mobile);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col h-[90vh]">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-slate-800">Informed Consent for Counseling</h2>
        </div>
        <div className="flex-1 p-8 bg-gray-50 overflow-y-auto text-slate-700 leading-relaxed text-sm">
          <div className="font-semibold mb-4">
            <p>Counselor's Name: Ms Dimple Wagle</p>
            <p>Institution/Organization: SPJIMR</p>
            <p>Student Name: {studentName}</p>
                                    <p>Mobile number: {role === 'student' ? 
              <input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} className="ml-2 p-1 border rounded" placeholder="Enter mobile..." /> : 
              (user?.mobile || <span className="text-red-500 font-bold">(Not provided)</span>)}
            </p>
            <p>Program: {program}</p>
          </div>

          <h3 className="font-bold text-base mt-6 mb-2">Purpose of Counseling:</h3>
          <p>The purpose of psychological counselling is to provide emotional support, guidance, and strategies to help address personal, social, and psychological concerns. Your participation in counselling is entirely voluntary.</p>

          <h3 className="font-bold text-base mt-6 mb-2">Nature of Counseling Sessions:</h3>
          <p>If you agree to participate, you will attend counselling sessions that may include discussion of personal thoughts, feelings, and experiences. The number and frequency of sessions will be determined based on your needs. Counseling may involve therapeutic techniques such as cognitive-behavioural strategies, mindfulness practices, or other evidence-based approaches.</p>

          <h3 className="font-bold text-base mt-6 mb-2">Risks and Benefits:</h3>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Potential Risks:</strong> Counseling may bring up difficult emotions or memories. If you experience distress, you are encouraged to discuss it with your counsellor, who will help you manage your emotions.</li>
            <li><strong>Potential Benefits:</strong> Counseling can help improve emotional well-being, enhance coping strategies, and provide support for personal challenges.</li>
          </ul>

          <h3 className="font-bold text-base mt-6 mb-2">Confidentiality:</h3>
          <p>Your personal information and counselling discussions will remain confidential. However, confidentiality has legal and ethical limits, and information may be disclosed in the following situations:</p>
          <ul className="list-disc list-inside space-y-2 mt-2">
            <li>If there is a risk of harm to yourself or others.</li>
            <li>If there is suspected abuse towards the participant or by the participant, either physical or verbal. Here the participant being an adult, it will be done with their consent.</li>
            <li>If required by a court order.</li>
          </ul>

          <h3 className="font-bold text-base mt-6 mb-2">Consent Statement:</h3>
          <p>I have read and understood the information provided in this consent form. I voluntarily agree to participate in psychological counselling. I understand the limits of confidentiality and my right to withdraw at any time. I have received a copy of this consent form.</p>

          <div className="mt-8 border-t pt-6">
            <p className="font-bold">Participant’s Name: {studentName}</p>
            {role === 'student' && (
              <div className="mt-2">
                <label className="block font-bold mb-1">Signature:</label>
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleSignatureUpload} className="hidden" />
                                                <button onClick={() => fileInputRef.current?.click()} className="text-blue-600 underline text-sm">Upload Signature Image</button>
                {signaturePreview && <img src={signaturePreview} alt="Signature Preview" className="mt-2 max-h-24 border rounded p-1" />} 
              </div>
            )}
            <p className="mt-2">Date: {new Date().toLocaleString()}</p>
          </div>

          <div className="mt-6">
            <p className="font-bold">Counselor’s Name: Ms Dimple Wagle</p>
            {role === 'counselor' && (
              <div className="mt-2">
                <label className="block font-bold mb-1">Signature:</label>
                <input 
                  type="text" 
                  value={signature as string}
                                    onChange={(e) => { setSignature(e.target.value); setSignaturePreview(e.target.value); }}
                  className="font-['Caveat',cursive] text-2xl border-b-2 w-full p-1 bg-transparent" 
                  placeholder="Type your name to sign"
                />
              </div>
            )}
                                    {role === 'student' && <p className="text-xs text-slate-400">(Counselor will sign upon confirmation)</p>}
            {role === 'counselor' && signaturePreview && <p className="font-serif italic text-2xl mt-2">{signaturePreview}</p>}
            <p className="mt-2">Date: {role === 'counselor' ? new Date().toLocaleString() : 'Pending Confirmation'}</p>
          </div>
          {error && <p className="text-red-500 text-sm mt-4 font-bold">{error}</p>}
        </div>
        <div className="p-4 bg-gray-100 border-t flex justify-end gap-4">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-gray-200 rounded-lg">Cancel</button>
          <button onClick={handleSubmit} className="px-6 py-2 bg-[#8A9A5B] text-white rounded-lg shadow-md hover:bg-[#76854d]">I Agree & Submit</button>
        </div>
      </div>
    </div>
  );
};

export default ConsentForm;
