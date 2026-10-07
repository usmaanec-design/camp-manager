import React, { createContext, useContext, useState } from 'react';
import { User, UserRole } from '../types';
import { authService, LoginCredentials, SignupData } from '../services/authService';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isAdmin: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  signup: (data: SignupData) => Promise<User>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  updateProfile: (updates: Partial<User>) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => authService.getCurrentUser());

  const role = user?.role || 'USER';
  const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const isAuthenticated = !!user;

  const login = async (credentials: LoginCredentials): Promise<User> => {
    const loggedUser = await authService.login(credentials);
    setUser(loggedUser);
    return loggedUser;
  };

  const signup = async (data: SignupData): Promise<User> => {
    const newUser = await authService.signup(data);
    setUser(newUser);
    return newUser;
  };

  const logout = async (): Promise<void> => {
    await authService.logout();
    setUser(null);
  };

  const switchRole = (newRole: UserRole) => {
    const switched = authService.switchRole(newRole);
    setUser(switched);
  };

  const updateProfile = async (updates: Partial<User>): Promise<User> => {
    const updated = authService.updateProfile(updates);
    setUser({ ...updated });
    return updated;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAdmin,
        isAuthenticated,
        login,
        signup,
        logout,
        switchRole,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
