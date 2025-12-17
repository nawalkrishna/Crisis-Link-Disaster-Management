import React from 'react';
import '../css/Card.css';
import { Link } from 'react-router-dom';

const ViewTaskCard = () => {
  return (
    <div className="card">
      <h3>View Volunteers Task</h3>
      <Link to="/VolunteerTask">
      <button>View</button>
      </Link>
    </div>
  );
};

export default ViewTaskCard;