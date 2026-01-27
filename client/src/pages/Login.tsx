import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function Login() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated && !loading) {
      setLocation('/dashboard');
    }
  }, [isAuthenticated, loading, setLocation]);

  const handleLogin = () => {
    window.location.href = getLoginUrl();
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#0047AB] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0047AB] flex items-center justify-center relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500 opacity-100"></div>
        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-blue-400/20 rounded-full blur-[120px] mix-blend-overlay"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-cyan-400/10 rounded-full blur-[100px] mix-blend-overlay"></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-cyan-400 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-400/20">
                  <div className="w-6 h-6 bg-white rounded-sm"></div>
                </div>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">NEROS JL</h1>
              <p className="text-blue-100 text-sm font-medium">Sistema de Help Desk</p>
            </div>

            <div className="space-y-6">
              <p className="text-center text-blue-100 text-sm">
                Acesse o sistema utilizando sua conta corporativa Manus.
              </p>

              <button
                onClick={handleLogin}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-cyan-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                Entrar com Manus
              </button>

              <div className="text-center text-xs text-blue-200/70">
                <p>Ao continuar, você concorda com os termos de uso</p>
                <p>e política de privacidade da Neosul.</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="mt-6 text-center">
          <p className="text-blue-200/60 text-xs">
            © {new Date().getFullYear()} Neosul. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
