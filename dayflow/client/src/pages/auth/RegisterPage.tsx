import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui';
import logoImg from '../../assets/logo.png';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F5F5F4] flex items-center justify-center p-8 font-sans">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3.5 mb-8 justify-center">
          <div className="w-16 h-16 rounded-full bg-white border-2 border-stone-200 p-1 flex items-center justify-center shadow-sm overflow-hidden">
            <img src={logoImg} alt="Work Suite Logo" className="w-full h-full object-contain rounded-full scale-105" />
          </div>
          <div>
            <h1 className="text-lg font-black text-stone-900 tracking-tight">Work Suite</h1>
            <p className="text-xs text-stone-500 font-bold uppercase tracking-wider">HRMS Platform</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-stone-200/50 p-8 text-center border border-stone-200/90">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/70 flex items-center justify-center mx-auto mb-4 shadow-xs">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <h2 className="text-xl font-black text-stone-900 mb-2 tracking-tight">Self-Registration Disabled</h2>
          <p className="text-stone-600 text-xs font-medium mb-6 leading-relaxed">
            Per company security policy, employee accounts and IDs are provisioned exclusively by HR Officers and Administrators.
            Please contact your HR administrator to receive your credentials.
          </p>

          <Button
            variant="primary"
            className="w-full py-2.5"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/login')}
          >
            Return to Login
          </Button>
        </div>
      </div>
    </div>
  );
};
