import React from 'react';
import '../css/Card.css';
import { Link } from 'react-router-dom';

const Thrissur= () => {
  return (
    <div className="card">
      <h3>THRISSUR</h3>
      
      <Link to ="CampDetails">
      <button>View</button>
      </Link>
    </div>
  );
};

export default Thrissur;