import {initializeApp} from 'firebase/app'
import {getAuth, GoogleAuthProvider} from 'firebase/auth'

const firebaseConfig={
  apiKey: "AIzaSyC6ClG_3y_e2XfngFjCPZ3hTbiy2srj6Zk",
  authDomain: "edunet-1048.firebaseapp.com",
  projectId: "edunet-1048",
  storageBucket: "edunet-1048.firebasestorage.app",
  messagingSenderId: "560139029678",
  appId: "1:560139029678:web:714755370d3c55c2a9f13f"

};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();

export default app;
