import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [registerData, setRegisterData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [registerErrors, setRegisterErrors] = useState<Record<string, string>>({});

  const { login, register } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(username, password);
      toast.success('Login realizado com sucesso!');
      setLocation('/dashboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  const validateRegister = () => {
    const errors: Record<string, string> = {};

    if (!registerData.fullName.trim()) {
      errors.fullName = 'Nome completo é obrigatório';
    }
    if (!registerData.username.trim()) {
      errors.username = 'Nome de usuário é obrigatório';
    }
    if (!registerData.email.trim()) {
      errors.email = 'Email é obrigatório';
    } else if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(registerData.email)) {
      errors.email = 'Email inválido';
    }
    if (!registerData.password) {
      errors.password = 'Senha é obrigatória';
    } else if (registerData.password.length < 3) {
      errors.password = 'Senha deve ter no mínimo 3 caracteres';
    }
    if (registerData.password !== registerData.confirmPassword) {
      errors.confirmPassword = 'As senhas não coincidem';
    }

    setRegisterErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateRegister()) {
      return;
    }

    setIsLoading(true);

    try {
      await register(
        registerData.fullName,
        registerData.username,
        registerData.email,
        registerData.password
      );
      toast.success('Cadastro realizado com sucesso! Você está logado.');
      setLocation('/dashboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao cadastrar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* NEROS Brand Background - Deep Corporate Blue */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]"></div>
      
      {/* Subtle geometric accents (Brandbook: "Geométricos", "Sem detalhes excessivos") */}
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-600/5 rounded-bl-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-blue-500/5 rounded-tr-full blur-3xl"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-8 shadow-2xl">
          {/* Logo and Title - NEROS Identity */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-blue-600 mb-6 shadow-lg shadow-blue-900/50">
              <span className="text-2xl font-bold text-white tracking-wider">NJ</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">NEROS</h1>
            <p className="text-slate-400 text-sm uppercase tracking-widest font-medium">Núcleo Estratégico de Resultados e Operações Neosul</p>
          </div>

          {!showRegister ? (
            // Login Form
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-blue-100 mb-2">
                  Usuário
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Digite seu usuário"
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-200 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-100 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-200 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-200 hover:text-cyan-400 transition"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <a href="#" className="text-cyan-400 hover:text-cyan-300 transition">
                  Esqueci a senha?
                </a>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold hover:from-blue-600 hover:to-cyan-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-slate-900 text-blue-200">ou</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowRegister(true);
                  setRegisterErrors({});
                }}
                className="w-full py-2 px-4 rounded-lg border border-cyan-400 text-cyan-400 font-semibold hover:bg-cyan-400/10 transition"
              >
                Cadastrar-se
              </button>

              {/* Demo credentials hint */}
              <div className="mt-6 p-3 rounded-lg bg-blue-500/20 border border-blue-400/30">
                <p className="text-xs text-blue-100 mb-1">
                  <strong>Credenciais de teste:</strong>
                </p>
                <p className="text-xs text-blue-100">
                  Usuário: <code className="bg-white/10 px-1 rounded">teste</code>
                </p>
                <p className="text-xs text-blue-100">
                  Senha: <code className="bg-white/10 px-1 rounded">123</code>
                </p>
              </div>
            </form>
          ) : (
            // Register Form
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-blue-100 mb-2">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={registerData.fullName}
                  onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })}
                  placeholder="Seu nome completo"
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-200 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition"
                  disabled={isLoading}
                />
                {registerErrors.fullName && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={14} /> {registerErrors.fullName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-100 mb-2">
                  Nome de Usuário
                </label>
                <input
                  type="text"
                  value={registerData.username}
                  onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                  placeholder="Escolha um nome de usuário"
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-200 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition"
                  disabled={isLoading}
                />
                {registerErrors.username && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={14} /> {registerErrors.username}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-100 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  placeholder="seu@email.com"
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-200 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition"
                  disabled={isLoading}
                />
                {registerErrors.email && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={14} /> {registerErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-100 mb-2">
                  Senha
                </label>
                <input
                  type="password"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  placeholder="Escolha uma senha"
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-200 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition"
                  disabled={isLoading}
                />
                {registerErrors.password && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={14} /> {registerErrors.password}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-100 mb-2">
                  Confirmar Senha
                </label>
                <input
                  type="password"
                  value={registerData.confirmPassword}
                  onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                  placeholder="Confirme sua senha"
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-200 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition"
                  disabled={isLoading}
                />
                {registerErrors.confirmPassword && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={14} /> {registerErrors.confirmPassword}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold hover:from-blue-600 hover:to-cyan-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Cadastrando...' : 'Cadastrar'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowRegister(false);
                  setRegisterData({
                    fullName: '',
                    username: '',
                    email: '',
                    password: '',
                    confirmPassword: '',
                  });
                  setRegisterErrors({});
                }}
                className="w-full py-2 px-4 rounded-lg border border-blue-400 text-blue-400 font-semibold hover:bg-blue-400/10 transition"
              >
                Voltar ao Login
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
