import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDSbB_x1YbtSfuGoZ6v2TZt64GdtgB_pSY",
  authDomain: "a-mazing-today.firebaseapp.com",
  databaseURL: "https://a-mazing-today-default-rtdb.firebaseio.com",
  projectId: "a-mazing-today",
  storageBucket: "a-mazing-today.firebasestorage.app",
  messagingSenderId: "1027410644717",
  appId: "1:1027410644717:web:97adf3aec123d3bb5a46e4",
  measurementId: "G-9XE8WX5TYF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
