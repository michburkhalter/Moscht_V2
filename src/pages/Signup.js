import React, {Component} from 'react';
import {Link} from 'react-router-dom';
import {signInWithGitHub, signInWithGoogle, signup} from "../helpers/auth";
import {onValue, ref, set} from "firebase/database";
import {db} from "../services/firebase";
import {sha256} from 'crypto-hash';

export default class SignUp extends Component {

    constructor() {
        super();
        this.state = {
            error: null,
            email: '',
            password: '',
            name: '',
            master_hash: '',
            zugangscode: '',
        };
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.googleSignIn = this.googleSignIn.bind(this);
        this.githubSignIn = this.githubSignIn.bind(this);
    }

    handleChange(event) {
        this.setState({
            [event.target.name]: event.target.value
        });
    }

    async componentDidMount() {
        const public_application = ref(db, 'public_application/');
        onValue(public_application, snapshot => {
            console.log("onValue db.public_application");

            snapshot.forEach(snap => {
                if (snap.key == 'master_hash') {
                    this.setState({
                        "master_hash": snap.val()
                    });
                }
            });
        });
    }

    async handleSubmit(event) {
        event.preventDefault();
        this.setState({error: ''});

        //console.log(await sha256('1a2b3c4d5e6f'));
        let hashed_input = await sha256(this.state.zugangscode)

        if (hashed_input !== this.state.master_hash) {
            this.setState({error: "Wrong access code"});
        } else {
            try {
                await signup(this.state.email, this.state.password).then(value => {
                    set(ref(db, 'user_settings/' + value.user.uid), {
                        UserName: this.state.name
                    });
                });
            } catch (error) {
                this.setState({error: error.message});
            }
        }
    }

    async googleSignIn() {
        try {
            await signInWithGoogle();
        } catch (error) {
            this.setState({error: error.message});
        }
    }

    async githubSignIn() {
        try {
            await signInWithGitHub();
        } catch (error) {
            console.log(error)
            this.setState({error: error.message});
        }
    }

    render() {
        return (
            <div className="container">
                <form className="mt-5 py-5 px-5" onSubmit={this.handleSubmit}>
                    <h1>
                        Sign Up to
                        <Link className="title ml-2" to="/">Moscht</Link>
                    </h1>
                    <p className="lead">Fill in the form below to create an account.</p>
                    <div className="form-group my-2">
                        <input className="form-control" placeholder="Name" name="name" type="text"
                               onChange={this.handleChange} value={this.state.name}></input>
                    </div>
                    <div className="form-group my-2">
                        <input className="form-control" placeholder="Email" name="email" type="email"
                               onChange={this.handleChange} value={this.state.email}></input>
                    </div>
                    <div className="form-group my-2">
                        <input className="form-control" placeholder="Password" name="password"
                               onChange={this.handleChange} value={this.state.password} type="password"></input>
                    </div>
                    <div className="form-group my-2">
                        <input className="form-control" placeholder="Access Code" name="zugangscode"
                               onChange={this.handleChange} value={this.state.zugangscode} type="text"></input>
                    </div>
                    <div className="form-group">
                        {this.state.error ? <p className="text-danger">{this.state.error}</p> : null}
                        <button className="btn btn-primary px-5" type="submit">Sign up</button>
                    </div>
                    <hr></hr>
                    <p>Already have an account? <Link to="/login">Login</Link></p>
                </form>
            </div>
        )
    }
}
