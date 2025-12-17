import React from 'react';
import '../css/Card.css';
import { Link } from 'react-router-dom';

const DisasterReliefCard = () => {
  return (
    <div className="card">
      <h3>Donate for Disaster Relief</h3>
      <p>Your contribution helps support victims of disasters.</p>
      <Link to="/DonationForm">
      <button>Donate Now</button>
      </Link>
    </div>
  );
};

export default DisasterReliefCard;