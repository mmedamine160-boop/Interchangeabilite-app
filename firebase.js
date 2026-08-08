import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Remplace ces valeurs par celles de TON projet Firebase
// (Console Firebase → Paramètres du projet → Tes applications → Config SDK)
const firebaseConfig = {
  apiKey: "AIzaSyCbElEIGAtuAzMhOkJMgKybRA14RTrpgiY",
  authDomain: "mezzanine-uap03.firebaseapp.com",
  projectId: "mezzanine-uap03",
  storageBucket: "mezzanine-uap03.firebasestorage.app",
  messagingSenderId: "623361175660",
  appId: "1:623361175660:web:7cadb28dd9146ab5846849",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
