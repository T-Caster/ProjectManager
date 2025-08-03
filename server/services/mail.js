const dotenv = require('dotenv');
dotenv.config();

const emailjs = require('@emailjs/nodejs');

emailjs.init({
    publicKey: process.env.EMAILJS_PUBLIC_KEY,
    privateKey: process.env.EMAILJS_PRIVATE_KEY,
});

console.log("EmailJS client initialized");

module.exports = emailjs;