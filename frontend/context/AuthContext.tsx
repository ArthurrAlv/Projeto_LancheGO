// context/AuthContext.tsx (Versão Final Corrigida com Tipagem)
"use client";

import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import apiClient from '@/lib/api';
import { useRouter } from 'next/navigation';

// Definimos a "forma" do nosso contexto para o TypeScript
interface AuthContextType {
    token: string | null;
    user: any;
    // --- MUDANÇA AQUI ---
    login: (username: string, password: string) => Promise<void>; 
    logout: () => void;
    isLoading: boolean;
}

// Criamos o contexto com um valor inicial nulo, mas com o tipo definido
const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const storedToken = localStorage.getItem('authToken');
        if (storedToken) {
            setToken(storedToken);
        }
        setIsLoading(false);
    }, []);
    
    // --- MUDANÇA AQUI ---
    const login = async (username: string, password: string) => {
        const response = await apiClient.post('/token/', { username, password });
        const { access } = response.data;
        localStorage.setItem('authToken', access);
        setToken(access);
    };

    const logout = () => {
        localStorage.removeItem('authToken');
        setToken(null);
        setUser(null);
        router.push('/'); // Redireciona para o login ao deslogar
    };

    return (
        <AuthContext.Provider value={{ token, user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

// Hook customizado para usar o contexto
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === null) {
        throw new Error("useAuth deve ser usado dentro de um AuthProvider");
    }
    return context;
};