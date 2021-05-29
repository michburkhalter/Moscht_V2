import React from 'react';
import { Link } from 'react-router-dom';
import { auth } from '../services/firebase';

function Header() {
  return (
    <header>
      <nav className="navbar navbar-expand-sm fixed-top navbar-light bg-light">
        <Link className="navbar-brand" to="/">
          Moscht
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-toggle="collapse"
          data-target="#navbarNavAltMarkup"
          aria-controls="navbarNavAltMarkup"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>
        <div
          className="collapse navbar-collapse justify-content-end"
          id="navbarNavAltMarkup"
        >
          {auth().currentUser ? (
            <div className="navbar-nav">
              <Link className="nav-item nav-link mr-3" to="/overview">
                Overview
              </Link>
              <Link className="nav-item nav-link mr-3" to="/eventstimeline">
                Events Timeline
              </Link>
              <Link className="nav-item nav-link mr-3" to="/addfill">
                Add Fill
              </Link>
              <Link className="nav-item nav-link mr-3" to="/detailstable">
                Fills Table
              </Link>
              <Link className="nav-item nav-link mr-3" to="/logs">
                Log Table
              </Link>
              <Link className="nav-item nav-link mr-3" to="/managecars">
                Manage Cars
              </Link>
              <Link className="nav-item nav-link mr-3" to="/profile">
                Profile
              </Link>
              <button
                className="btn btn-primary mr-3"
                onClick={() => auth().signOut()}
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="navbar-nav">
              <Link className="nav-item nav-link mr-3" to="/login">
                Sign In
              </Link>
              <Link className="nav-item nav-link mr-3" to="/signup">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Header;
