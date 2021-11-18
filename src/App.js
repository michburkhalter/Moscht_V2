import React, {Component} from 'react';
import {BrowserRouter as Router, Redirect, Route, Switch} from 'react-router-dom';

import Home from './pages/Home';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Logs from './pages/Logs';
import ManageCars from './pages/ManageCars';
import Profile from './pages/Profile';
import AddFill from './pages/AddFill';
import DetailsTable from './pages/DetailsTable';
import CarEventsTimeline from './pages/CarEventsTimeline';
import Overview from './pages/Overview'
import {auth} from './services/firebase';
import './style.css';

function PrivateRoute({component: Component, authenticated, ...rest}) {
    return (
        <Route
            {...rest}
            render={props =>
                authenticated === true ? (
                    <Component {...props} />
                ) : (
                    <Redirect
                        to={{pathname: '/login', state: {from: props.location}}}
                    />
                )
            }
        />
    );
}

function PublicRoute({component: Component, authenticated, ...rest}) {
    return (
        <Route
            {...rest}
            render={props =>
                authenticated === false ? (
                    <Component {...props} />
                ) : (
                    <Redirect to="/addfill"/>
                )
            }
        />
    );
}

class App extends Component {
    constructor() {
        super();
        this.state = {
            authenticated: false,
            loading: true
        };
    }

    componentDidMount() {
        auth().onAuthStateChanged(user => {
            if (user) {
                this.setState({
                    authenticated: true,
                    loading: false
                });
            } else {
                this.setState({
                    authenticated: false,
                    loading: false
                });
            }
        });
    }

    render() {
        return this.state.loading === true ? (
            <div className="spinner-border text-success" role="status">
                <span className="sr-only">Loading...</span>
            </div>
        ) : (
            <Router>
                <Switch>
                    <Route exact path="/" component={Home}/>
                    <PublicRoute
                        path="/signup"
                        authenticated={this.state.authenticated}
                        component={Signup}
                    />
                    <PublicRoute
                        path="/login"
                        authenticated={this.state.authenticated}
                        component={Login}
                    />
                    <PrivateRoute
                        path="/profile"
                        authenticated={this.state.authenticated}
                        component={Profile}
                    />
                    <PrivateRoute
                        path="/logs"
                        authenticated={this.state.authenticated}
                        component={Logs}
                    />
                    <PrivateRoute
                        path="/managecars"
                        authenticated={this.state.authenticated}
                        component={ManageCars}
                    />
                    <PrivateRoute
                        path="/addfill"
                        authenticated={this.state.authenticated}
                        component={AddFill}
                    />
                    <PrivateRoute
                        path="/detailstable"
                        authenticated={this.state.authenticated}
                        component={DetailsTable}
                    />
                    <PrivateRoute
                        path="/eventstimeline"
                        authenticated={this.state.authenticated}
                        component={CarEventsTimeline}
                    />
                    <PrivateRoute
                        path="/overview"
                        authenticated={this.state.authenticated}
                        component={Overview}
                    />
                </Switch>
            </Router>
        );
    }
}

export default App;
