const axios = require("axios");

const axiosInstance = axios.create({
  baseURL: process.env.NODE_APP_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  responseType: "json",
});

module.exports = axiosInstance;
