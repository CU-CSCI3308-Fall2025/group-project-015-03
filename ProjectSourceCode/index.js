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

// Allow form submissions
app.use(express.urlencoded ({ extended:true }));

// Temporary "database"
let entries = [
  { title: 'First Entry', text: 'Started journaling today!'},
  { title: 'Second Entry', text: 'Feeling productive and creative.'}
];

//Journal list page
app.get('/journal', (req, res) => {
  res.render('pages/journal', {
    layout: 'main',
    entries
  })
});

// Add new entry form
app.get('/journal/new', (req,res) => {
  res.render('pages/newJournal', {layout: 'main'});
});

// Handle form submission
app.get('/jourmal/new', (req, res) => {
  const{title, text} = req.body;
  entries.push({title, text});
  res.redirect('/journal');
});

// temporary backend so the page doesnt crash when you save new journal entry
app.post('/journal/new', (req, res) => {
  console.log('Received new entry (but backend not connected yet)');
  res.redirect('/journal');
});

// app.listen(3000);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});