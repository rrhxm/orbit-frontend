import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCDIwJqYNeREdG1j2rzUlm1qEjWXyWB1Lw",
  authDomain: "orbit-30ba7.firebaseapp.com",
  projectId: "orbit-30ba7",
  storageBucket: "orbit-30ba7.appspot.com",
  messagingSenderId: "569586911123",
  appId: "1:569586911123:web:6a342193d9fdb6f4988a66"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // ✅ Firestore initialized

export { app, auth, db };
