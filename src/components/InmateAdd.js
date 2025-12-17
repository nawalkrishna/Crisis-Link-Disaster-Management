import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { firestore } from './firebase'; // Assuming you have initialized and exported Firestore from firebase.js
import '../css/SignupPage.css';

const InmateAdd = () => {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    place: '',
    address: '',
  
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Ensure all required fields are filled
      if (!formData.name || !formData.age || !formData.place || !formData.address ) {
        console.error('Please fill out all fields');
        return;
      }

      // Add document to Firestore collection
      await setDoc(doc(firestore, 'kannur', formData.name), {
        name: formData.name,
        age: formData.age,
        place: formData.place,
        address: formData.address,
       
      });

      // Clear form fields after submission
      setFormData({
        name: '',
        age: '',
        place: '',
        address: '',
        
      });

      console.log('Inmate added successfully!');
    } catch (error) {
      console.error('Error adding inmate:', error);
    }
  };

  return (
    <div className='container'>
      <h2>Add Camp Members</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Name:
          <input type="text" name="name" value={formData.name} onChange={handleInputChange} required />
        </label>
        <label>
          Age:
          <input type="number" name="age" value={formData.age} onChange={handleInputChange} required />
        </label>
        <label>
          Place:
          <input type="text" name="place" value={formData.place} onChange={handleInputChange} required />
        </label>
        <label>
          Address:
          <input type="text" name="address" value={formData.address} onChange={handleInputChange} required />
        </label>
       
        <button type="submit">Add</button>
      </form>
    </div>
  );
};

export default InmateAdd;
