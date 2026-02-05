import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Eye, EyeOff, ArrowRight, ArrowLeft, User, Building2 } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
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
    return <LoadingSpinner fullScreen size="lg" text="Carregando..." />;
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
      {/* Background with gradient matching Neosul branding */}
      <div className="absolute inset-0 z-0">
        {/* Base gradient - Neosul blue palette */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#003366] via-[#004080] to-[#0059b3]"></div>
        
        {/* Animated gradient orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-blue-400/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[80%] h-[80%] bg-cyan-400/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      {/* Header with Neosul logo */}
      <header className="absolute top-0 left-0 right-0 z-20 p-8">
        <div className="flex items-center gap-3">
          <img src="/neosul-logo.png" alt="Neosul Logo" className="h-12 w-auto" />
          <div>
            <span className="text-white font-bold text-xl tracking-wide block">NEROS JL</span>
            <span className="text-blue-200 text-xs">Portal de Sistemas</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left side - Branding and welcome message */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left space-y-6"
          >
            <div className="inline-block">
              <img src="/neosul-logo.png" alt="Neosul" className="h-24 w-auto mb-6" />
            </div>
            
            <h1 className="text-white text-5xl xl:text-6xl font-bold tracking-tight leading-tight">
              Bem-vindo ao<br />
              <span className="text-cyan-300">Portal NEROS</span>
            </h1>
            
            <p className="text-blue-100 text-lg xl:text-xl max-w-lg leading-relaxed">
              Sistema integrado de gestão empresarial. Acesse chamados, projetos e ferramentas de produtividade em um só lugar.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <div className="flex items-center gap-2 text-blue-200">
                <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                <span className="text-sm">Gestão de Chamados</span>
              </div>
              <div className="flex items-center gap-2 text-blue-200">
                <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                <span className="text-sm">Controle de Projetos</span>
              </div>
              <div className="flex items-center gap-2 text-blue-200">
                <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                <span className="text-sm">Gestão de Equipes</span>
              </div>
            </div>
          </motion.div>

          {/* Right side - Login form */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full max-w-md mx-auto"
          >
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: mode === 'login' ? 20 : -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-center mb-8">
                    <h2 className="text-white text-3xl font-bold mb-2">
                      {mode === 'login' ? 'Acesse sua conta' : 'Criar nova conta'}
                    </h2>
                    <p className="text-blue-200 text-sm">
                      {mode === 'login' ? 'Entre com suas credenciais' : 'Preencha os dados para cadastro'}
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Name field (only for register) */}
                    {mode === 'register' && (
                      <div>
                        <label className="block text-white/90 text-sm font-medium mb-2">Nome completo</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300" />
                          <input
                            type="text"
                            placeholder="Seu nome"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full bg-white/5 border border-white/20 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-blue-300/50 focus:outline-none focus:border-cyan-400 focus:bg-white/10 transition-all"
                          />
                        </div>
                      </div>
                    )}

                    {/* Email field */}
                    <div>
                      <label className="block text-white/90 text-sm font-medium mb-2">E-mail</label>
                      <input
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full bg-white/5 border border-white/20 rounded-xl py-3.5 px-4 text-white placeholder:text-blue-300/50 focus:outline-none focus:border-cyan-400 focus:bg-white/10 transition-all"
                      />
                    </div>

                    {/* Password field */}
                    <div>
                      <label className="block text-white/90 text-sm font-medium mb-2">Senha</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={6}
                          className="w-full bg-white/5 border border-white/20 rounded-xl py-3.5 px-4 pr-12 text-white placeholder:text-blue-300/50 focus:outline-none focus:border-cyan-400 focus:bg-white/10 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Sector field (only for register) */}
                    {mode === 'register' && (
                      <div>
                        <label className="block text-white/90 text-sm font-medium mb-2">Setor</label>
                        <div className="relative">
                          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300" />
                          <select
                            value={sector}
                            onChange={(e) => setSector(e.target.value)}
                            className="w-full bg-white/5 border border-white/20 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-400 focus:bg-white/10 transition-all appearance-none cursor-pointer"
                          >
                            {sectors.map((s) => (
                              <option key={s.value} value={s.value} className="bg-[#004080] text-white">
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
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-cyan-500/50 disabled:to-blue-500/50 text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-8 shadow-lg shadow-cyan-500/30"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Processando...</span>
                        </div>
                      ) : (
                        <>
                          {mode === 'login' ? 'Entrar' : 'Criar conta'}
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
                        className="text-blue-200 hover:text-white text-sm transition-colors"
                        onClick={() => toast.info('Funcionalidade em desenvolvimento')}
                      >
                        Esqueceu a senha?
                      </button>
                    )}

                    <div className="pt-2">
                      {mode === 'login' ? (
                        <>
                          <p className="text-blue-200 text-sm mb-3">Não tem uma conta?</p>
                          <button
                            type="button"
                            onClick={() => setMode('register')}
                            className="w-full border-2 border-white/30 hover:border-white/50 hover:bg-white/5 text-white font-medium py-3 rounded-xl transition-all"
                          >
                            Cadastrar-se
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setMode('login')}
                          className="text-blue-200 hover:text-white font-medium transition-colors flex items-center justify-center gap-2 mx-auto"
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
                      className="mt-6 p-4 bg-cyan-500/10 border border-cyan-400/30 rounded-xl"
                    >
                      <p className="text-cyan-200 text-xs text-center leading-relaxed">
                        Após o cadastro, sua conta precisará ser aprovada por um administrador antes de acessar o sistema.
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
      <footer className="absolute bottom-0 left-0 right-0 z-20 p-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
          <span className="text-blue-200/70">
            Acesso exclusivo para colaboradores autorizados
          </span>
          <span className="text-blue-200/70">
            © {new Date().getFullYear()} Neosul. Todos os direitos reservados.
          </span>
        </div>
      </footer>
    </div>
  );
}
