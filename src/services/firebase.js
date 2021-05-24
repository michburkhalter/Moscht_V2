import firebase from "firebase/app";
import "firebase/auth";
import "firebase/database";
import "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDSmdP7dUrzz11ozZs7RrN9PdPh2QeYAqE",
  authDomain: "moscht-d3512.firebaseapp.com",
  databaseURL: "https://moscht-d3512.firebaseio.com",
  projectId: "moscht-d3512",
  storageBucket: "moscht-d3512.appspot.com",
  messagingSenderId: "1074821206007",
  appId: "1:1074821206007:web:66c297ad5edb8110e528f2",
  measurementId: "G-KX8TPRF55J"
};

firebase.initializeApp(firebaseConfig);

export const auth = firebase.auth;
export const db = firebase.database();

// Get a reference to the storage service, which is used to create references in your storage bucket
export var storage = firebase.storage();

// Create a storage reference from our storage service
export var storageRef = storage.ref();