import React from 'react';
import {Link} from 'react-router-dom';
import {auth} from '../services/firebase';
import { signOut } from "firebase/auth";
import 'bootstrap/dist/css/bootstrap.min.css';

function Header() {
    return (
        <header>
            <nav className="navbar navbar-expand-sm fixed-top navbar-light bg-light">
                <Link className="navbar-brand mx-3" to="/">
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
                    <span className="navbar-toggler-icon"/>
                </button>
                <div
                    className="collapse navbar-collapse justify-content-end"
                    id="navbarNavAltMarkup"
                >
                    {auth.currentUser ? (
                        <div className="navbar-nav">
                            <Link className="nav-item nav-link mx-2" to="/overview">
                                Overview
                            </Link>
                            <Link className="nav-item nav-link mx-2" to="/eventstimeline">
                                Events Timeline
                            </Link>
                            <Link className="nav-item nav-link mx-2" to="/addfill">
                                Add Fill
                            </Link>
                            <Link className="nav-item nav-link mx-2" to="/detailstable">
                                Fills Table
                            </Link>
                            <Link className="nav-item nav-link mx-2" to="/logs">
                                Log Table
                            </Link>
                            <Link className="nav-item nav-link mx-2" to="/managecars">
                                Manage Cars
                            </Link>
                            <Link className="nav-item nav-link mx-2" to="/profile">
                                Profile
                            </Link>
                            <button
                                className="btn btn-primary mx-3"
                                onClick={() => signOut(auth)}
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
