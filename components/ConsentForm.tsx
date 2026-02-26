import React, { useState, useRef } from 'react';
import { Role, User } from '../types';
import { Download, FileText } from 'lucide-react';

interface ConsentFormProps {
  role: Role;
  studentName: string;
  program: string;
  onClose: () => void;
  onSubmit: (signature: string | File, mobile?: string) => void;
  user?: User;
}

/** Generates a print-to-PDF window for the consent form */
const downloadConsentPDF = (
  role: Role,
  studentName: string,
  program: string,
  mobile: string,
  signature: string,
  signaturePreview: string
) => {
  const date = new Date().toLocaleString();
  const counselorName = 'Ms. Dimple Wagle';
  const isStudent = role === 'student';

  const signatureSection = isStudent && signaturePreview
    ? `<img src="${signaturePreview}" alt="Signature" style="max-height:80px;border:1px solid #ccc;padding:4px;border-radius:4px;margin-top:4px;" />`
    : !isStudent && signature
      ? `<p style="font-family:'Caveat',cursive;font-size:28px;margin:4px 0;">${signature}</p>`
      : '<p style="color:#999;font-style:italic;">(Pending)</p>';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Consent Form – ${studentName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Caveat&display=swap" rel="stylesheet"/>
  <style>
    @page { margin: 24mm 20mm; }
    body { font-family: 'Inter', sans-serif; font-size: 13px; color: #222; line-height: 1.7; }
    h1 { font-size: 18px; text-align: center; margin-bottom: 4px; }
    .subtitle { text-align: center; color: #666; font-size: 12px; margin-bottom: 20px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; background: #f7f7f7; padding: 12px 16px; border-radius: 6px; margin-bottom: 16px; border: 1px solid #e0e0e0; }
    h3 { font-size: 13px; font-weight: 700; margin: 16px 0 4px; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; }
    ul { padding-left: 20px; margin: 4px 0; }
    li { margin-bottom: 4px; }
    .sig-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; border-top: 2px solid #e0e0e0; padding-top: 16px; }
    .sig-box { border: 1px solid #ccc; border-radius: 6px; padding: 12px; min-height: 80px; }
    .sig-label { font-size: 11px; font-weight: 700; color: #555; margin-bottom: 8px; text-transform: uppercase; letter-spacing: .05em; }
    .watermark { text-align: center; color: #ccc; font-size: 10px; margin-top: 32px; }
  </style>
</head>
<body>
  <h1>Informed Consent for Psychological Counseling</h1>
  <p class="subtitle">SPJIMR — Confidential</p>

  <div class="info-grid">
    <div><strong>Student Name:</strong> ${studentName}</div>
    <div><strong>Program:</strong> ${program}</div>
    <div><strong>Mobile:</strong> ${mobile || '—'}</div>
    <div><strong>Date:</strong> ${date}</div>
    <div><strong>Counselor:</strong> ${counselorName}</div>
    <div><strong>Institution:</strong> SPJIMR</div>
  </div>

  <h3>Purpose of Counseling</h3>
  <p>The purpose of psychological counselling is to provide emotional support, guidance, and strategies to help address personal, social, and psychological concerns. Participation is entirely voluntary.</p>

  <h3>Nature of Counseling Sessions</h3>
  <p>Sessions may include discussion of personal thoughts, feelings, and experiences. The number and frequency of sessions will be determined based on your needs. Counseling may involve evidence-based therapeutic techniques such as cognitive-behavioural strategies or mindfulness practices.</p>

  <h3>Risks and Benefits</h3>
  <ul>
    <li><strong>Potential Risks:</strong> Counseling may bring up difficult emotions or memories. If you experience distress, please discuss it with your counsellor.</li>
    <li><strong>Potential Benefits:</strong> Counseling can improve emotional well-being, enhance coping strategies, and provide support for personal challenges.</li>
  </ul>

  <h3>Confidentiality</h3>
  <p>Your personal information and counselling discussions will remain confidential, except in these situations:</p>
  <ul>
    <li>If there is a risk of harm to yourself or others.</li>
    <li>If there is suspected abuse (physical or verbal) — done with the adult participant's consent.</li>
    <li>If required by a court order.</li>
  </ul>

  <h3>Consent Statement</h3>
  <p>I have read and understood the information provided. I voluntarily agree to participate in psychological counselling. I understand the limits of confidentiality and my right to withdraw at any time.</p>

  <div class="sig-section">
    <div class="sig-box">
      <div class="sig-label">Participant (Student) — ${studentName}</div>
      ${isStudent ? signatureSection : '<p style="color:#999;font-style:italic;">Signed on submission</p>'}
      <p style="font-size:11px;color:#666;margin-top:6px;">Date: ${date}</p>
    </div>
    <div class="sig-box">
      <div class="sig-label">Counselor — ${counselorName}</div>
      ${!isStudent ? signatureSection : '<p style="color:#999;font-style:italic;">Pending counselor confirmation</p>'}
      <p style="font-size:11px;color:#666;margin-top:6px;">Date: ${!isStudent ? date : 'Pending'}</p>
    </div>
  </div>

  <p class="watermark">Generated by SPeakUp | SPJIMR Mental Health Ecosystem • ${date}</p>

  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
};

const ConsentForm: React.FC<ConsentFormProps> = ({ role, studentName, program, onClose, onSubmit, user }) => {
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [signature, setSignature] = useState<string | File>('');
  const [error, setError] = useState('');
  const [signaturePreview, setSignaturePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 1024 * 1024) {
        setError('File size must be less than 1MB.');
        return;
      }
      setError('');
      setSignature(file);
      const reader = new FileReader();
      reader.onload = (ev) => setSignaturePreview(ev.target?.result as string);
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

  const handleDownloadPDF = () => {
    const sigStr = signature instanceof File ? signaturePreview : (signature as string);
    downloadConsentPDF(role, studentName, program, mobile, sigStr, signaturePreview);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col h-[90vh]">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">Informed Consent for Counseling</h2>
          <button
            onClick={handleDownloadPDF}
            title="Download PDF"
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Download size={14} /> Download PDF
          </button>
        </div>
        <div className="flex-1 p-8 bg-gray-50 overflow-y-auto text-slate-700 leading-relaxed text-sm">
          <div className="font-semibold mb-4">
            <p>Counselor's Name: Ms. Dimple Wagle</p>
            <p>Institution: SPJIMR</p>
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
            <p className="font-bold">Participant's Name: {studentName}</p>
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
            <p className="font-bold">Counselor's Name: Ms. Dimple Wagle</p>
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
        <div className="p-4 bg-gray-100 border-t flex justify-between items-center gap-4">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 text-sm"
          >
            <FileText size={16} /> Save as PDF
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-gray-200 rounded-lg">Cancel</button>
            <button onClick={handleSubmit} className="px-6 py-2 bg-[#8A9A5B] text-white rounded-lg shadow-md hover:bg-[#76854d]">I Agree & Submit</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsentForm;
