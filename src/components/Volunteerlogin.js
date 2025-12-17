import React, { useState } from 'react';
import "../css/volunteerlogin.css"
import { Link , useNavigate } from 'react-router-dom';
import {auth,db} from './firebase'
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
const Volunteerlogin = () => {
  const [email,setEmail] = useState('')
  const [password, setPassword]= useState('')
  const [error, setError] = useState('');
  const navigate = useNavigate(); // Initialize useNavigate


  const handleSubmit = async(e) => {
    e.preventDefault();
    try {
      // Query Firestore to find user with the entered email
      const usersRef = collection(db, 'volunteers');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const userData = doc.data();

        // Check if the entered password matches the user's password
        if (userData.password === password) {
          // Sign in if email and password match
          await signInWithEmailAndPassword(auth, email, password);
          console.log("Signed in successfully");
          setError(''); // Clear any previous errors
          navigate("/VolunteerHome"); // Navigate to DonationForm.js on successful login
        } else {
          setError("Incorrect password");
        }
      } else {
        setError("User not found");
      }
    } catch (err) {
      console.error("Error signing in:", err);
      setError("Error signing in. Please try again.");
    }
  };

  return (
    <div className='container'>
      <h2>LogIn</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Email:
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password:
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="error">{error}</p>} {/* Display error message if there is one */}
        
        <button type="submit">Login</button>
        <Link to="/VolunteerReg"><p>Create account</p></Link>
      </form>
    </div>
  );
};



export default Volunteerlogin;