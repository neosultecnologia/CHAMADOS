import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Loader2, Eye, EyeOff, ArrowRight, ArrowLeft, User, Building2 } from 'lucide-react';
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
        <Loader2 className="w-8 h-8 animate-spin text-white" />
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
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Background with gradient and light effect */}
      <div className="absolute inset-0 z-0">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#001a4d] via-[#0047AB] to-[#0066cc]"></div>
        
        {/* Light beam effect from top-left */}
        <div 
          className="absolute top-0 left-0 w-full h-full"
          style={{
            background: 'linear-gradient(135deg, rgba(100,180,255,0.15) 0%, transparent 40%)',
          }}
        ></div>
        
        {/* Light beam effect from bottom-right */}
        <div 
          className="absolute bottom-0 right-0 w-full h-full"
          style={{
            background: 'radial-gradient(ellipse at 80% 80%, rgba(255,255,255,0.2) 0%, transparent 50%)',
          }}
        ></div>
        
        {/* Subtle light streaks */}
        <div 
          className="absolute top-0 left-1/4 w-1/2 h-full opacity-30"
          style={{
            background: 'linear-gradient(160deg, transparent 0%, rgba(100,180,255,0.1) 30%, transparent 60%)',
          }}
        ></div>
      </div>

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 p-6">
        <span className="text-white font-bold text-lg tracking-wide">NEROS JL</span>
      </header>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex">
        {/* Left side - Branding */}
        <div className="hidden lg:flex flex-1 flex-col justify-center px-16 xl:px-24">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-white text-6xl xl:text-7xl font-bold tracking-tight mb-6">
              NEROS
            </h1>
            <p className="text-white/80 text-lg xl:text-xl max-w-md leading-relaxed">
              Sistema integrado que organiza processos, pessoas e performance.
            </p>
          </motion.div>
        </div>

        {/* Right side - Login form */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full max-w-md"
          >
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: mode === 'login' ? 20 : -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="text-white text-2xl font-bold mb-8">
                    {mode === 'login' ? 'Acesse sua conta' : 'Criar nova conta'}
                  </h2>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Name field (only for register) */}
                    {mode === 'register' && (
                      <div>
                        <label className="block text-white/70 text-sm mb-2">Nome completo</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                          <input
                            type="text"
                            placeholder="Seu nome"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full bg-transparent border-b border-white/20 py-3 pl-10 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-white/50 transition-colors"
                          />
                        </div>
                      </div>
                    )}

                    {/* Email field */}
                    <div>
                      <label className="block text-white/70 text-sm mb-2">Usuário</label>
                      <input
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full bg-transparent border-b border-white/20 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/50 transition-colors"
                      />
                    </div>

                    {/* Password field */}
                    <div>
                      <label className="block text-white/70 text-sm mb-2">Senha</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={6}
                          className="w-full bg-transparent border-b border-white/20 py-3 pr-10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/50 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-0 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Sector field (only for register) */}
                    {mode === 'register' && (
                      <div>
                        <label className="block text-white/70 text-sm mb-2">Setor</label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                          <select
                            value={sector}
                            onChange={(e) => setSector(e.target.value)}
                            className="w-full bg-transparent border-b border-white/20 py-3 pl-10 text-white focus:outline-none focus:border-white/50 transition-colors appearance-none cursor-pointer"
                          >
                            {sectors.map((s) => (
                              <option key={s.value} value={s.value} className="bg-[#0047AB] text-white">
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Submit button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-[#d4a853] hover:bg-[#c49943] disabled:bg-[#d4a853]/50 text-white font-semibold py-3.5 rounded-lg transition-all flex items-center justify-center gap-2 mt-8"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          {mode === 'login' ? 'Login' : 'Criar conta'}
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Links */}
                  <div className="mt-6 space-y-4 text-center">
                    {mode === 'login' && (
                      <button
                        type="button"
                        className="text-white/60 hover:text-white/80 text-sm transition-colors"
                        onClick={() => toast.info('Funcionalidade em desenvolvimento')}
                      >
                        Esqueci a senha?
                      </button>
                    )}

                    <div className="pt-2">
                      {mode === 'login' ? (
                        <>
                          <p className="text-white/50 text-sm mb-2">Não tem uma conta?</p>
                          <button
                            type="button"
                            onClick={() => setMode('register')}
                            className="w-full border border-white/20 hover:border-white/40 text-white font-medium py-3 rounded-lg transition-all"
                          >
                            Cadastrar-se
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setMode('login')}
                          className="text-white/60 hover:text-white/80 font-medium transition-colors flex items-center justify-center gap-1 mx-auto"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          Voltar para login
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Info text for registration */}
                  {mode === 'register' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-6 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
                    >
                      <p className="text-yellow-200/80 text-xs text-center">
                        Após o cadastro, sua conta precisará ser aprovada por um administrador.
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 z-20 p-6 flex justify-between items-center">
        <span className="text-white/50 text-sm">
          Acesso exclusivo para colaboradores.
        </span>
        <span className="text-white/50 text-sm">
          Copyright © {new Date().getFullYear()} Neosul. Todos os direitos reservados.
        </span>
      </footer>
    </div>
  );
}
