import React, { useState } from 'react';
import '../css/DonationForm.css';
import { doc, setDoc } from 'firebase/firestore';
import { firestore } from './firebase'; // Assuming you have initialized and exported Firestore from firebase.js

const DonationForm = () => {
  const [donorName, setDonorName] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [specifiedItem, setSpecifiedItem] = useState('');
  const [quantity, setQuantity] = useState('');

  const handleDonorChange = (e) => {
    setDonorName(e.target.value);
  };

  const handleItemChange = (e) => {
    setSelectedItem(e.target.value);
  };

  const handleSpecifiedItemChange = (e) => {
    setSpecifiedItem(e.target.value);
  };

  const handleQuantityChange = (e) => {
    setQuantity(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Check if either selectedItem or specifiedItem is provided
      const itemToDonate = selectedItem || specifiedItem;

      // Ensure all required fields are filled
      if (!donorName || !itemToDonate || !quantity) {
        console.error('Please fill out all fields');
        return;
      }

      // Add document to Firestore collection
      await setDoc(doc(firestore, 'donations', donorName), {
        donorName: donorName,
        itemToDonate: itemToDonate,
        specifiedItem:specifiedItem,
        quantity: quantity,
      });

      // Clear form fields after submission
      setDonorName('');
      setSelectedItem('');
      setSpecifiedItem('');
      setQuantity('');

      console.log('Donation submitted successfully!');
    } catch (error) {
      console.error('Error submitting donation:', error);
    }
  };

  const items = [
    'Food',
    'Clothing',
    'Blankets',
    'Medicine',
    'Toiletries',
    'Books',
    'Toys',
    'Other',
  ];

  return (
    <div className="form-container">
      <h2>Extend a Helping Hand</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Donor Name:
          <input type="text" value={donorName} onChange={handleDonorChange} />
        </label>
        <br />
        <label>
          Item:
          <select value={selectedItem} onChange={handleItemChange}>
            <option value="">Select Item</option>
            {items.map((item, index) => (
              <option key={index} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <br />
        <label>
          Specify item:
          <input type="text" value={specifiedItem} onChange={handleSpecifiedItemChange} />
        </label>
        <br />
        <label>
          Quantity:
          <input type="number" value={quantity} onChange={handleQuantityChange} />
        </label>
        <br />
        <button type="submit">Donate</button>
      </form>
    </div>
  );
};

export default DonationForm;
