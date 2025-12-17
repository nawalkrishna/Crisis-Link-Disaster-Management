import React from 'react';
import '../css/Card.css';
import { Link } from 'react-router-dom';
const ViewMembersCard = () => {
  return (
    <div className="card">
      <h3>Details Of Inmates</h3>
      
      <Link to ="/ViewMemberHome">
      <button>View</button>
      </Link>
    </div>
  );
};

export default ViewMembersCard;