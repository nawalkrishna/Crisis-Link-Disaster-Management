import React from 'react';
import '../css/Card.css';
import { Link } from 'react-router-dom';

const Kannur1 = () => {
  return (
    <div className="card">
      <h3>Kannur</h3>
    
      <Link to="/ViewCampMem2">
      <button>View</button>
      </Link>
    </div>
  );
};

export default Kannur1;