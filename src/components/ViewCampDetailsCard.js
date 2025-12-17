import React from 'react';
import '../css/Card.css';
import { Link } from 'react-router-dom';

const ViewCampDetailsCard = () => {
  return (
    <div className="card">
      <h3>Nearest Camp Details</h3>
      
      <Link to ="/UserHome">
      <button>View</button>
      </Link>
    </div>
  );
};

export default ViewCampDetailsCard;