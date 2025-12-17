import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { firestore } from './firebase'; // Assuming you have initialized and exported Firestore from firebase.js
import '../css/DonateCard.css';

function DonateCard() {
  const [donationAmount, setDonationAmount] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleDonate = async () => {
    try {
      // Add document to Firestore collection
      await setDoc(doc(firestore, 'amount',name), {
        donationAmount: donationAmount,
        name: name,
        email: email,
        message: message,
      });

      // Clear form fields after submission
      setDonationAmount('');
      setName('');
      setEmail('');
      setMessage('');

      console.log('Donation submitted successfully!');
    } catch (error) {
      console.error('Error submitting donation:', error);
    }
  };

  return (
    <div className="donate-card">
      <div className="bank-details">
        <h3>Bank Details:</h3>
        <p>Account Name: XYZ Foundation</p>
        <p>Account Number: 123456789</p>
        <p>Bank Name: ABC Bank</p>
        <p>IFSC Code: ABCD1234</p>
      </div>
      <h2>Make a Donation</h2>
      <form>
        <label htmlFor="donationAmount">Donation Amount:</label>
        <input
          type="number"
          id="donationAmount"
          value={donationAmount}
          onChange={(e) => setDonationAmount(e.target.value)}
        />
        <label htmlFor="name">Name:</label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label htmlFor="email">Email:</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label htmlFor="message">Message (optional):</label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button type="button" onClick={handleDonate}>Donate</button>
      </form>
    </div>
  );
}

export default DonateCard;

