import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { firestore } from './firebase'; // Assuming you have initialized and exported Firestore from firebase.js
import '../css/SignupPage.css';

const AddCamNeeds = () => {
  const [formData, setFormData] = useState({
    district: '',
    location: '',
    phoneNumber: '',
    need: '',
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
      if (!formData.district || !formData.location || !formData.phoneNumber || !formData.need ) {
        console.error('Please fill out all fields');
        return;
      }

      // Add document to Firestore collection
      await setDoc(doc(firestore, 'needs', formData.district + '_' + formData.location), {
        district: formData.district,
        location: formData.location,
        phoneNumber: formData.phoneNumber,
        need: formData.need,
      });

      // Clear form fields after submission
      setFormData({
        district: '',
        location: '',
        phoneNumber: '',
        need: '',
      });

      console.log('Inmate added successfully!');
    } catch (error) {
      console.error('Error adding inmate:', error);
    }
  };

  return (
    <div className='container'>
      <h2>Add Camp Needs</h2>
      <form onSubmit={handleSubmit}>
        <label>
          District:
          <input type="text" name="district" value={formData.district} onChange={handleInputChange} required />
        </label>
        <label>
          Location:
          <input type="text" name="location" value={formData.location} onChange={handleInputChange} required />
        </label>
        <label>
          Phone Number:
          <input type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} required />
        </label>
        <label>
          Need:
          <input type="text" name="need" value={formData.need} onChange={handleInputChange} required />
        </label>
       
        <button type="submit">Add</button>
      </form>
    </div>
  );
};

export default AddCamNeeds;

