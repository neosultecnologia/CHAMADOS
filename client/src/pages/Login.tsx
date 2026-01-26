import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registerData.password !== registerData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    setIsLoading(true);
    try {
      await register(registerData.fullName, registerData.username, registerData.email, registerData.password);
      toast.success('Cadastro realizado com sucesso!');
      setLocation('/dashboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao cadastrar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex relative overflow-hidden bg-[#0047AB]">
      {/* Background Gradient/Image Simulation */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-600 to-blue-400 opacity-100"></div>
        {/* Abstract Waves/Glows */}
        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-blue-400/30 rounded-full blur-[120px] mix-blend-overlay"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[80%] h-[80%] bg-cyan-400/20 rounded-full blur-[120px] mix-blend-overlay"></div>
        <div className="absolute top-[40%] left-[30%] w-[60%] h-[60%] bg-blue-300/10 rounded-full blur-[100px] mix-blend-overlay"></div>
      </div>

      {/* Content Container */}
      <div className="container mx-auto relative z-10 flex flex-col lg:flex-row items-center justify-between h-screen px-6 lg:px-12">
        
        {/* Left Side - Brand Info */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-start text-white mb-10 lg:mb-0">
          <div className="mb-8">
            <h2 className="text-sm font-bold tracking-widest mb-4 uppercase opacity-80">NEROS JL</h2>
            <h1 className="text-6xl lg:text-8xl font-black tracking-tighter mb-6">NEROS</h1>
            <p className="text-xl lg:text-2xl font-light text-blue-100 max-w-lg leading-relaxed">
              Sistema integrado que organiza processos, pessoas e performance.
            </p>
          </div>
          <div className="mt-auto absolute bottom-8 left-12 hidden lg:block">
            <p className="text-xs text-blue-200 opacity-60">Acesso exclusivo para colaboradores.</p>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-[420px]">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-white mb-8">
              {showRegister ? 'Crie sua conta' : 'Acesse sua conta'}
            </h2>

            {!showRegister ? (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-blue-100 mb-1.5 ml-1">Usuário</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="seu@email.com" // Placeholder from screenshot
                    className="w-full px-4 py-3 rounded-xl bg-blue-900/20 border border-blue-300/30 text-white placeholder-blue-300/50 focus:outline-none focus:border-white/50 focus:bg-blue-900/30 transition-all"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-blue-100 mb-1.5 ml-1">Senha</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-xl bg-blue-900/20 border border-blue-300/30 text-white placeholder-blue-300/50 focus:outline-none focus:border-white/50 focus:bg-blue-900/30 transition-all"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300 hover:text-white transition"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 mt-2"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                    <>
                      Login <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <div className="flex flex-col items-center gap-4 mt-6 pt-4 border-t border-white/10">
                  <button type="button" className="text-sm text-blue-200 hover:text-white transition">
                    Esqueci a senha?
                  </button>
                  
                  <div className="w-full text-center">
                    <p className="text-xs text-blue-300 mb-3">Não tem uma conta?</p>
                    <button
                      type="button"
                      onClick={() => setShowRegister(true)}
                      className="w-full py-2.5 px-4 rounded-xl border border-white/20 text-white hover:bg-white/10 transition-all text-sm font-medium"
                    >
                      Cadastrar-se
                    </button>
                  </div>
                </div>

                {/* Demo Credentials */}
                <div className="mt-6 text-center">
                  <p className="text-[10px] text-blue-300/60">
                    Credenciais de teste:<br/>
                    teste / 123
                  </p>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-blue-100 mb-1.5 ml-1">Nome Completo</label>
                  <input
                    type="text"
                    value={registerData.fullName}
                    onChange={(e) => setRegisterData({...registerData, fullName: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-blue-900/20 border border-blue-300/30 text-white focus:outline-none focus:border-white/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-blue-100 mb-1.5 ml-1">Usuário</label>
                  <input
                    type="text"
                    value={registerData.username}
                    onChange={(e) => setRegisterData({...registerData, username: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-blue-900/20 border border-blue-300/30 text-white focus:outline-none focus:border-white/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-blue-100 mb-1.5 ml-1">Email</label>
                  <input
                    type="email"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-blue-900/20 border border-blue-300/30 text-white focus:outline-none focus:border-white/50 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-blue-100 mb-1.5 ml-1">Senha</label>
                    <input
                      type="password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-blue-900/20 border border-blue-300/30 text-white focus:outline-none focus:border-white/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-blue-100 mb-1.5 ml-1">Confirmar</label>
                    <input
                      type="password"
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-blue-900/20 border border-blue-300/30 text-white focus:outline-none focus:border-white/50 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-semibold transition-all mt-2"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Criar Conta'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowRegister(false)}
                  className="w-full py-2 text-sm text-blue-200 hover:text-white transition"
                >
                  Voltar para Login
                </button>
              </form>
            )}
          </motion.div>
          
          <div className="mt-8 text-center lg:text-right">
            <p className="text-[10px] text-blue-300/40">
              Copyright © 2025 Neosu Todos os direitos reservados
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
