// context/AuthContext.tsx (Versão Final Corrigida com Tipagem)
"use client";

import { createContext, useState, useContext, useEffect, ReactNode, useCallback  } from 'react';
import apiClient from '@/lib/api';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

// Interface para os dados do usuário que extraímos do token
interface User {
  user_id: number;
  username: string;
  is_superuser: boolean;
}

// Definimos a "forma" do nosso contexto para o TypeScript
interface AuthContextType {
    token: string | null;
    user: User | null; // <-- MUDANÇA: Tipagem corrigida de 'any' para 'User | null'
    login: (newToken: string) => void; // <-- MUDANÇA: login agora aceita apenas o token
    logout: () => void;
    isLoading: boolean;
}

// Criamos o contexto com um valor inicial nulo, mas com o tipo definido
const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const updateUserFromToken = useCallback((currentToken: string | null) => {
        if (currentToken) {
            // Define o token no estado e nos headers do apiClient
            setToken(currentToken);
            apiClient.defaults.headers['Authorization'] = `Bearer ${currentToken}`;
            
            // Decodifica o token para extrair as informações do usuário
            try {
                const decodedToken: any = jwtDecode(currentToken);
                setUser({
                    user_id: decodedToken.user_id,
                    username: decodedToken.username,
                    is_superuser: decodedToken.is_superuser || false
                });
            } catch (error) {
                console.error("Token inválido:", error);
                // Se o token for inválido, limpa tudo
                localStorage.removeItem('authToken');
                setToken(null);
                setUser(null);
            }
        } else {
            // Limpa o estado se não houver token
            setToken(null);
            setUser(null);
            delete apiClient.defaults.headers['Authorization'];
        }
        // --- MUDANÇA CRÍTICA: Avisa a aplicação que o carregamento inicial terminou ---
        setIsLoading(false);
    }, []);

    useEffect(() => {
        const storedToken = localStorage.getItem('authToken');
        updateUserFromToken(storedToken);
    }, [updateUserFromToken]);
    
    // --- MUDANÇA AQUI ---
    const login = (newToken: string) => {
        localStorage.setItem('authToken', newToken);
        updateUserFromToken(newToken);
    };

    const logout = () => {
        updateUserFromToken(null);
        router.push('/');
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