import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    User,
    onAuthStateChanged,
    signOut as firebaseSignOut
} from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log("AuthProvider: Initializing...");

        // Safety timeout: stop loading after 8 seconds if Firebase hangs
        const timeoutId = setTimeout(() => {
            console.warn("AuthProvider: Timeout reached. Forcing loading to false.");
            setLoading(false);
        }, 8000);

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            console.log("AuthProvider: Auth state changed", currentUser ? "User Logged In" : "No User");
            setUser(currentUser);
            clearTimeout(timeoutId);
            setLoading(false);
        });

        return () => {
            unsubscribe();
            clearTimeout(timeoutId);
        };
    }, []);

    const logout = async () => {
        await firebaseSignOut(auth);
    };

    const value = {
        user,
        loading,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <h2 className="text-xl font-semibold">Cargando aplicación...</h2>
                    <p className="text-gray-400 mt-2 text-sm">Esperando a Firebase Auth...</p>
                </div>
            ) : (
                children
            )}
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
