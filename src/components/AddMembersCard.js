import React from 'react';
import '../css/Card.css';
import { Link } from 'react-router-dom';
const AddMembersCard = () => {
  return (
    <div className="card">
      <h3>Add Camp Members Details</h3>
      <Link to="/MemAdd">
      <button>Add</button>
      </Link>
   
    </div>
  );
};

export default AddMembersCard;