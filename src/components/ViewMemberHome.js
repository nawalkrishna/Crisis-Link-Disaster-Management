import React from 'react';

import Kannur1 from './Kannur1';
import Wayanad1 from './Wayanad1';

import '../css/HomePage.css';



const ViewMemberHome = () => {
  return (
    <div className='mainContainer'>
      <div className="homeContainer">
        <h1>We Are Here For You</h1>
        <div className="card-container">
        
          <Kannur1 />
          <Wayanad1/>
          
        </div>
      </div>
    </div>
  );
};

export default ViewMemberHome;