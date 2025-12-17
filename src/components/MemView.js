import React from 'react';

import Kannur from './Kannur';
import Wayanad from './Wayanad';
import Kozhikod from './Kozhikod';
import Malappuram from './Malappuram';
import Palakkad from './Palakkad';
import Thrissur from './Thrissur';
import Ernakulam from './Ernakulam';
import Idukki from './Idukki';
import Kottayam from './Kottayam';
import Alappuzha from './Alappuzha';
import Pathanamthitta from './Pathanamthitta';
import Trivandrum from './Trivandrum';

import '../css/HomePage.css';



const MemView= () => {
  return (
    <div className='mainContainer'>
      <div className="homeContainer">
        <h1>We Are Here For You</h1>
        <div className="card-container">
        
          <Kannur />
          <Wayanad/>
          <Kozhikod/>
          <Malappuram/>
          <Palakkad/>
          <Thrissur/>
          <Ernakulam/>
          <Idukki/>
          <Kottayam/>
          <Alappuzha/>
          <Pathanamthitta/>
          <Trivandrum/>
        </div>
      </div>
    </div>
  );
};

export default MemView;