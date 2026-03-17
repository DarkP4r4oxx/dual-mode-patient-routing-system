import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyCfZ75ThnHULP-aI146-bzBQfjzocnAY7k",
    authDomain: "syncq-8124e.firebaseapp.com",
    projectId: "syncq-8124e",
    storageBucket: "syncq-8124e.firebasestorage.app",
    messagingSenderId: "737540839785",
    appId: "1:737540839785:web:52088f9474094e74a985f8",
    measurementId: "G-RKK9MRTCML"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
