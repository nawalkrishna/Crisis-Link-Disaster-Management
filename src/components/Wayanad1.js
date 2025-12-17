import React from 'react';
import '../css/Card.css';
import { Link } from 'react-router-dom';

const Wayanad1 = () => {
  return (
    <div className="card">
      <h3>Wayanad</h3>
    
      <Link to="/ViewCampMem">
      <button>view</button>
      </Link>
    </div>
  );
};

export default Wayanad1;