import firebase from "firebase/app";
import "firebase/auth";
import "firebase/database";
import "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDAOtB5bsHj1C9EoRjyYRbKPtzoLIiT88g",
  authDomain: "moscht2.firebaseapp.com",
  projectId: "moscht2",
  storageBucket: "moscht2.appspot.com",
  messagingSenderId: "955528020736",
  appId: "1:955528020736:web:200d16f1df74efee1e29e5"
};


firebase.initializeApp(firebaseConfig);

export const auth = firebase.auth;
export const db = firebase.database();

// Get a reference to the storage service, which is used to create references in your storage bucket
export var storage = firebase.storage();

// Create a storage reference from our storage service
export var storageRef = storage.ref();