import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Estas configuraciones vienen de variables de entorno .env (VITE_ prefix para Vite)
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyApEY9Q8XcCnljc3RJQwZnrBvC0UMw55uk",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mvp-nic-market.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mvp-nic-market",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mvp-nic-market.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "771683909511",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:771683909511:web:2bfded8a5c9d6c56de5d22"
};

console.log("🔥 Initializing Firebase for Project:", firebaseConfig.projectId);

// Runtime Validation
const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'] as const;
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);

if (missingKeys.length > 0) {
    const errorMsg = `CRITICAL CONFIG ERROR: Missing Firebase keys: ${missingKeys.join(', ')}.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Conexión a emuladores si estamos en desarrollo local
if (import.meta.env.DEV) {
    // Si necesitas conectar a emuladores, descomenta estas líneas:
    // import { connectAuthEmulator } from 'firebase/auth';
    // connectAuthEmulator(auth, 'http://localhost:9099');
}

export default app;
