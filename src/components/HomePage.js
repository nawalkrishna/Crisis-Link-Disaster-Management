import React from 'react';
import DisasterReliefCard from './DisasterReliefCard';
import VolunteerCard from './VolunteerCard';
import FundraisingCard from './FundraisingCard';

import '../css/HomePage.css';



const HomePage = () => {
  return (
    <div className='mainContainer'>
      <div className="homeContainer">
        <h1>Welcome to Crisis Link</h1>
        <div className="card-container">
          <DisasterReliefCard />
          <FundraisingCard />
          <VolunteerCard />
      
          
        </div>
      </div>
    </div>
  );
};

export default HomePage;