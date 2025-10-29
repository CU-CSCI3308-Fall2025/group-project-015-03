const express = require('express'); // To build an application server or API
const app = express();
const handlebars = require('express-handlebars');
const Handlebars = require('handlebars');
const path = require('path');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');

// database configuration
const dbConfig = {
  host: 'db', // the database server 
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig); 

// test your database
db.connect()
  .then(obj => {
    console.log('Database connection successful'); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

// middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// serve static files (for your frontend)
app.use(express.static(path.join(__dirname, 'src/resources')));
app.use(express.static(path.join(__dirname, 'src/views')));

app.get('/register', (req, res) => {
    //TODO
});

app.get('/login', (req, res) => {
    //TODO
});

app.get('/home', (req, res) => {
    //TODO
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});