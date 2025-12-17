import React from 'react';
import '../css/Card.css';
import { Link } from 'react-router-dom';

const Idukki = () => {
  return (
    <div className="card">
      <h3>IDUKKI</h3>
      
      <Link to ="CampHome">
      <button>View</button>
      </Link>
    </div>
  );
};

export default Idukki ;