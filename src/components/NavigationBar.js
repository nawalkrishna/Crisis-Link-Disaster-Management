import React from 'react';
import { Link } from 'react-router-dom';
import '../css/NavigationBar.css';

const NavigationBar = () => {
  return (
    <nav>
      <ul>
        <li className="page-name"><Link to="/">Crisis Link</Link></li>
        <li><Link to="/about">About</Link></li>
        {/* <li><Link to="/signup">Sign Up</Link></li> */}
        <li><Link to="/communicationtoolscard">Communicate</Link></li>
        <li className="login-link"><Link to="/login">Login</Link></li>
      </ul>
    </nav>
  );
};

export default NavigationBar;