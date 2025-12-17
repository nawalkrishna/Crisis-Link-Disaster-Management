import React from 'react';
import '../css/Card.css';
import { Link } from 'react-router-dom';
const ViewReqCard = () => {
  return (
    <div className="card">
      <h3>Camp Requirements</h3>
      <Link to="/CampRequ">
      <button>View</button>
      </Link>
    </div>
  );
};

export default ViewReqCard;