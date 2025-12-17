import React from 'react';
import '../css/Card.css';
import { Link } from 'react-router-dom';

const Wayanad = () => {
  return (
    <div className="card">
      <h3>Wayanad</h3>
    
      <Link to="/InmateAdd2">
      <button>Add</button>
      </Link>
    </div>
  );
};

export default Wayanad;