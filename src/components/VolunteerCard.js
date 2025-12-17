import React from 'react';
import '../css/Card.css';
import { Link } from 'react-router-dom';

const VolunteerCard = () => {
  return (
    <div className="card">
      <h3>Volunteer</h3>
      <p>Become a volunteer and support disaster relief</p>
      <Link to="/VolunteerReg">
        <button>Volunteer</button>
      </Link>
    </div>
  );
};

export default VolunteerCard;