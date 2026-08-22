import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Dayflow</h1>
            <p className="text-xs text-slate-400">HRMS</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold text-slate-800 mb-2">Self-Registration Disabled</h2>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">
            Per company security policy, employee accounts and IDs are created directly by HR Officers & Administrators.
            Please contact your HR administrator to obtain your login credentials.
          </p>

          <Button
            variant="primary"
            className="w-full"
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
