import React from 'react';
import '../css/Card.css';
import { Link } from 'react-router-dom';
const AddReqCard = () => {
  return (
    <div className="card">
      <h3>Add Camp Requirements</h3>
      <Link to="/AddCamNeeds">
      <button>Add</button>
      </Link>
    </div>
  );
};

export default AddReqCard;