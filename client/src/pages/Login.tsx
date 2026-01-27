import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Loader2, Mail, Lock, User, Building2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';

type AuthMode = 'login' | 'register';

export default function Login() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [sector, setSector] = useState('Outro');

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      toast.success('Login realizado com sucesso!');
      setLocation('/dashboard');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setMode('login');
      setName('');
      setPassword('');
      setSector('Outro');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      setLocation('/dashboard');
    }
  }, [isAuthenticated, authLoading, setLocation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'login') {
      loginMutation.mutate({ email, password });
    } else {
      registerMutation.mutate({ name, email, password, sector: sector as any });
    }
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-[#0047AB] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  const sectors = [
    { value: 'TI', label: 'TI' },
    { value: 'RH', label: 'RH' },
    { value: 'Financeiro', label: 'Financeiro' },
    { value: 'Comercial', label: 'Comercial' },
    { value: 'Suporte', label: 'Suporte' },
    { value: 'Operações', label: 'Operações' },
    { value: 'Outro', label: 'Outro' },
  ];

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
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-cyan-400 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-400/20">
                  <div className="w-6 h-6 bg-white rounded-sm"></div>
                </div>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">NEROS JL</h1>
              <p className="text-blue-100 text-sm font-medium">
                {mode === 'login' ? 'Sistema de Help Desk' : 'Criar nova conta'}
              </p>
            </div>

            <AnimatePresence mode="wait">
              <motion.form
                key={mode}
                initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mode === 'login' ? 20 : -20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {/* Name field (only for register) */}
                {mode === 'register' && (
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-200/50" />
                    <input
                      type="text"
                      placeholder="Nome completo"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent transition-all"
                    />
                  </div>
                )}

                {/* Email field */}
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-200/50" />
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent transition-all"
                  />
                </div>

                {/* Password field */}
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-200/50" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-11 pr-11 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-200/50 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Sector field (only for register) */}
                {mode === 'register' && (
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-200/50" />
                    <select
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent transition-all appearance-none cursor-pointer"
                    >
                      {sectors.map((s) => (
                        <option key={s.value} value={s.value} className="bg-blue-900 text-white">
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-500/50 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-cyan-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : mode === 'login' ? (
                    'Entrar'
                  ) : (
                    'Criar conta'
                  )}
                </button>

                {/* Toggle mode */}
                <div className="text-center pt-2">
                  {mode === 'login' ? (
                    <p className="text-blue-100 text-sm">
                      Não tem uma conta?{' '}
                      <button
                        type="button"
                        onClick={() => setMode('register')}
                        className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                      >
                        Cadastre-se
                      </button>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors flex items-center justify-center gap-1 mx-auto"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Voltar para login
                    </button>
                  )}
                </div>
              </motion.form>
            </AnimatePresence>

            {/* Info text for registration */}
            {mode === 'register' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl"
              >
                <p className="text-yellow-200 text-xs text-center">
                  Após o cadastro, sua conta precisará ser aprovada por um administrador antes de poder acessar o sistema.
                </p>
              </motion.div>
            )}

            <div className="mt-6 text-center text-xs text-blue-200/70">
              <p>Ao continuar, você concorda com os termos de uso</p>
              <p>e política de privacidade da Neosul.</p>
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
