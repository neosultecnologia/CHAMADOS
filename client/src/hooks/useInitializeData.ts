import { useEffect } from 'react';

export const useInitializeData = () => {
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
  }, []);
};
