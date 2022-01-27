import {auth} from "../services/firebase";
import {createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut} from "firebase/auth";

export function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
}

export function signin(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
}

export function signInWithGoogle() {
    //const provider = new auth.GoogleAuthProvider();
    //return auth.signInWithPopup(provider);
}

export function signInWithGitHub() {
    //const provider = new auth.GithubAuthProvider();
    //return auth.signInWithPopup(provider);
}

export function logout() {
    return signOut(auth);
}
