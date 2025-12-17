import React from 'react';
import '../css/Card.css';
import { Link } from 'react-router-dom';

const Kannur = () => {
  return (
    <div className="card">
      <h3>Kannur</h3>
    
      <Link to="/InmateAdd">
      <button>Add</button>
      </Link>
    </div>
  );
};

export default Kannur;