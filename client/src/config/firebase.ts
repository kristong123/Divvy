// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "divvy-14457.firebaseapp.com",
  databaseURL: "https://divvy-14457-default-rtdb.firebaseio.com",
  projectId: "divvy-14457",
  storageBucket: "divvy-14457.firebasestorage.app",
  messagingSenderId: "229466702760",
  appId: "1:229466702760:web:5df0bd9bdbb8ff66fe539d",
  measurementId: "G-3ZXDZ5PTSK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app)