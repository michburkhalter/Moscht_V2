import React, {Component} from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import {Link} from 'react-router-dom';
import CookieBot from "react-cookiebot";


export default class HomePage extends Component {
    render() {
        return (
            <div className="home">
                <Header></Header>
                <section>
                    <div className="jumbotron jumbotron-fluid py-5">
                        <div className="container text-center py-5">
                            <h1 className="display-4">Welcome to Moscht V2</h1>
                            <p className="lead">Get insights into your fuel consumption</p>
                            <div className="mt-4">
                                <Link className="btn btn-secondary px-5 mx-3" to="/signup">Create New Account</Link>
                                <Link className="btn btn-primary px-5 mx-3" to="/login">Login to Your Account</Link>
                            </div>
                        </div>
                    </div>
                </section>
                <CookieBot domainGroupId='71a94a9d-7714-4996-ac6e-6c96fafeac84'/>
                <Footer></Footer>
            </div>
        )
    }
}
