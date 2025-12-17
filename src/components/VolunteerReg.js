import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { auth, firestore } from './firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

import "../css/volunteerReg.css"

const VolunteerReg = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [district, setDistrict] = useState('');
  const [hometown, setHometown] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (phoneNumber.length !== 10) {
      setError("Phone number must be 10 digits");
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(firestore, 'volunteers', user.uid), {
        name: name,
        email: email,
        phoneNumber: phoneNumber,
        district: district,
        hometown: hometown,
        password: password
      });

      setSuccessMessage("Registration successful!");
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setPhoneNumber('');
      setDistrict('');
      setHometown('');
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
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Email:
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password:
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <label>
          Confirm Password:
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
        </label>
        <label>
          Phone Number:
          <input type="text" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
        </label>
        <label>
          District:
          <input type="text" value={district} onChange={(e) => setDistrict(e.target.value)} />
        </label>
        <label>
          Hometown:
          <input type="text" value={hometown} onChange={(e) => setHometown(e.target.value)} />
        </label>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
        <button type="submit">Sign Up</button>
        <Link to="/Volunteerlogin"><p>Already have an account? Log in</p></Link>
      </form>
    </div>
  );
};

export default VolunteerReg;



