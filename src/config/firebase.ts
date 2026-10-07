import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyCKJGr--UNs_Rvbnjlo2WgZMVMoM5XA0_0",
  authDomain: "zahran-camp.firebaseapp.com",
  projectId: "zahran-camp",
  storageBucket: "zahran-camp.firebasestorage.app",
  messagingSenderId: "38540969713",
  appId: "1:38540969713:web:539f8483b9bb98be3ccb50",
  measurementId: "G-D0X54Z4917"
};

// Initialize Firebase App singleton
export const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
