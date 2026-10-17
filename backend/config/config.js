require("dotenv").config();

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: "postgres",
    pool: {
      max: 20, // Allow more simultaneous connections
      min: 2, // Maintain some idle connections ready to use
      acquire: 600000, // Reasonable time (60 sec) * 10  to wait for a connection before throwing error
      idle: 10000,
    },
    timezone: "+00:00", // UTC
    logging: true,
    // dialectOptions: {
    //   ssl: {
    //     require: true,
    //     rejectUnauthorized: false, // You can use this if you don't have a certificate to verify the server.
    //   },
    // },
  },
  test: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: "postgres",
    pool: {
      max: 20, // Allow more simultaneous connections
      min: 0, // Maintain some idle connections ready to use
      acquire: 600000, // Reasonable time (60 sec) * 10  to wait for a connection before throwing error
      idle: 10000,
    },
    timezone: "+00:00", // UTC
    logging: true,
    // dialectOptions: {
    //   ssl: {
    //     require: true,
    //     rejectUnauthorized: false, // You can use this if you don't have a certificate to verify the server.
    //   },
    // },
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: "postgres",
    pool: {
      max: 20, // Allow more simultaneous connections
      min: 0, // Maintain some idle connections ready to use
      acquire: 600000, // Reasonable time (60 sec) * 10  to wait for a connection before throwing error
      idle: 10000, // Keep unused connections for (30 sec) * 10 before closing
    },
    timezone: "+00:00", // UTC
    logging: true,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
};
