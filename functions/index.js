'use strict';
const functions = require("firebase-functions")

exports.helloworld = functions.https.onRequest((request,response)=>{
  functions.logger.info("Hello logs!",{structuredData:true});
  response.send("Hello fromse Firebase @ autodeploy!");
});


exports.helloeurope = functions.https.onRequest((request,response)=>{
  functions.logger.info("Hello logs!",{structuredData:true});
  response.send("Hello fromse Sofa @ autodeploy!");
});