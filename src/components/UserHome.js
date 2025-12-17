import React from 'react';

import Kannur2 from './Kannur2';
import Wayanad2 from './Wayanad2';

import '../css/HomePage.css';



const UserHome = () => {
  return (
    <div className='mainContainer'>
      <div className="homeContainer">
        <h1>We Are Here For You</h1>
        <div className="card-container">
        
          <Kannur2/>
          <Wayanad2/>
          
        </div>
      </div>
    </div>
  );
};

export default UserHome;