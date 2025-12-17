// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {getAuth} from 'firebase/auth'

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCC-ZiPoDpsGJlyVm-gXQT4q1mLNPjHlYE",
  authDomain: "authentication-c237c.firebaseapp.com",
  projectId: "authentication-c237c",
  storageBucket: "authentication-c237c.appspot.com",
  messagingSenderId: "341148502094",
  appId: "1:341148502094:web:d86028938e94ecd40a1b1f"
};

// Initialize Firebase
 const app = initializeApp(firebaseConfig);
 const auth = getAuth(app)

 export {auth}