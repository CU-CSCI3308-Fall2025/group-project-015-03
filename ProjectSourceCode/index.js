const express = require('express'); // To build an application server or API
const app = express();
const handlebars = require('express-handlebars');
const Handlebars = require('handlebars');
const path = require('path');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');

const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: path.join(__dirname + '/src/views/layouts'),
  partialsDir: path.join(__dirname + '/src/views/partials'),
});

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
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, '/src/views'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// serve static files (for your frontend)
app.use(express.static(path.join(__dirname, 'src/resources')));

app.get('/', (req, res) => {
  res.redirect('/login');
});

app.get('/register', (req, res) => {
    res.render('pages/index', { title: 'Register'});
});

app.get('/login', (req, res) => {
    res.render('pages/index', { title: 'Login'})
});

app.get('/home', (req, res) => {
    res.render('pages/feed', { title: 'Home'});
});

app.get('/profile', (req, res) => {
    res.render('pages/profile', { layout: 'secondary' , title: 'Profile' })
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});