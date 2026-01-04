import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Estas configuraciones deberían venir de variables de entorno .env
// Por ahora, usamos una estructura base que el usuario puede completar.
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

// Runtime Validation
const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'] as const;
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);

if (missingKeys.length > 0) {
    const errorMsg = `CRITICAL CONFIG ERROR: Missing Firebase keys: ${missingKeys.join(', ')}. Check your .env setup or Hosting secrets.`;
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
