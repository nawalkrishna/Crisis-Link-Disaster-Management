import React from 'react';
import ViewCampDetailsCard from './ViewCampDetailsCard';
import ViewMembersCard from './ViewMembersCard';
import ViewReqCard from './ViewReqCard';

import '../css/HomePage.css';


const UserHome2 = () => {
  return (
    <div className='mainContainer'>
      <div className="homeContainer">
        <h1>We Are Here For You</h1>
        <div className="card-container">
          <ViewCampDetailsCard />
          <ViewMembersCard />
          <ViewReqCard />
        </div>
      </div>
    </div>
  );
};

export default UserHome2;