import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (fullName: string, username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize default users and load user from localStorage on mount
  useEffect(() => {
    // Initialize default users if not already present
    const existingUsers = localStorage.getItem('users');
    if (!existingUsers) {
      const defaultUsers = [
        {
          id: 'user_1',
          fullName: 'Usuário Teste',
          username: 'teste',
          email: 'teste@teste',
          password: '123',
        },
      ];
      localStorage.setItem('users', JSON.stringify(defaultUsers));
    }

    // Load current user from localStorage
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse stored user:', e);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Get users from localStorage
    const usersJson = localStorage.getItem('users');
    const users = usersJson ? JSON.parse(usersJson) : [];

    // Find user
    const foundUser = users.find((u: any) => u.username === username && u.password === password);

    if (!foundUser) {
      throw new Error('Usuário ou senha inválidos');
    }

    const userData: User = {
      id: foundUser.id,
      username: foundUser.username,
      fullName: foundUser.fullName,
      email: foundUser.email,
    };

    setUser(userData);
    localStorage.setItem('currentUser', JSON.stringify(userData));
  };

  const register = async (fullName: string, username: string, email: string, password: string) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Get existing users
    const usersJson = localStorage.getItem('users');
    const users = usersJson ? JSON.parse(usersJson) : [];

    // Check if username already exists
    if (users.some((u: any) => u.username === username)) {
      throw new Error('Nome de usuário já existe');
    }

    // Check if email already exists
    if (users.some((u: any) => u.email === email)) {
      throw new Error('Email já cadastrado');
    }

    // Create new user
    const newUser = {
      id: `user_${Date.now()}`,
      fullName,
      username,
      email,
      password, // In production, this should be hashed
    };

    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));

    // Auto-login after registration
    const userData: User = {
      id: newUser.id,
      username: newUser.username,
      fullName: newUser.fullName,
      email: newUser.email,
    };

    setUser(userData);
    localStorage.setItem('currentUser', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
