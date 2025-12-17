import React from 'react';
import '../css/Card.css';
import { Link } from 'react-router-dom';

const Wayanad2 = () => {
  return (
    <div className="card">
      <h3>Wayanad</h3>
    
      <Link to="/ViewCampDetails1">
      <button>View</button>
      </Link>
    </div>
  );
};

export default Wayanad2;