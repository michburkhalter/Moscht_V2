import {initializeApp} from 'firebase/app';
import {getDatabase} from "firebase/database";
import {getAuth} from "firebase/auth";
import {getStorage, ref} from "firebase/storage";


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

//  firebase.initializeApp(firebaseConfig);
const app = initializeApp(firebaseConfig);

//export const auth = firebase.auth;
export const auth = getAuth(app);

//export const db = firebase.database();
export const db = getDatabase(app);

// Get a reference to the storage service, which is used to create references in your storage bucket
//export var storage = firebase.storage();
export const storage = getStorage(app);

// Create a storage reference from our storage service
//export var storageRef = storage.ref();
export const storageRef = ref(storage);