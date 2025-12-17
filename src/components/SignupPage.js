import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { auth, firestore } from './firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

import "../css/SignupPage.css";

const SignupPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(firestore, 'users', user.uid), {
        name: name,
        email: email,
        // You may not want to store passwords in plain text. This is just for demonstration purposes.
        password: password,
      });

      setSuccessMessage("Registration successful!");
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className='container'>
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Name:
          <input type="text" onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Email:
          <input type="email" onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password:
          <input type="password" onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label>
          Confirm Password:
          <input type="password" onChange={(e) => setConfirmPassword(e.target.value)} />
        </label>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
        <button type="submit">Sign Up</button>
        <Link to="/login"><p>Already Registered? Login here</p></Link>
      </form>
    </div>
  );
};

export default SignupPage;


