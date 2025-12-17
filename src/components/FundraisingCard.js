import React from 'react';
import '../css/Card.css';
import { Link } from 'react-router-dom';

const FundraisingCard = () => {
  return (
    <div className="card">
      <h3>Raise Funds</h3>
      <p>Support disaster relief efforts by raising funds online.</p>
      <Link to="/DonateCard">
      <button>Start Fundraising</button>
      </Link>
    </div>
  );
};

export default FundraisingCard;