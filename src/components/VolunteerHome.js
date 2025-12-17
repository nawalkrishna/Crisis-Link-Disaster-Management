import React from 'react';
import AddMembersCard from './AddMembersCard';
import AddReqCard from './AddReqCard';
import ViewTaskCard from './ViewTaskCard';

import '../css/HomePage.css';

const VolunteerHome = () => {
  return (
    <div className='mainContainer'>
      <div className="homeContainer">
        <h1>Spread Kindness, Volunteer Your Time......</h1>
        <div className="card-container">
          <AddMembersCard />
          <AddReqCard />
          <ViewTaskCard />
        </div>
      </div>
    </div>
  );
};

export default VolunteerHome;