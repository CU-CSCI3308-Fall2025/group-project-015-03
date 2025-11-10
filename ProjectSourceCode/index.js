const express = require('express'); // To build an application server or API
const app = express();
const handlebars = require('express-handlebars');
const Handlebars = require('handlebars');
const path = require('path');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');

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

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// serve static files (for your frontend)
app.use(express.static(path.join(__dirname, 'src/resources')));


app.use(session({
  secret: 'tumble-stack-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

function requireLogin(req, res, next) {
  // temporary bypass for frontend testing
  if (!req.session.user) {
    req.session.user = { username: 'admin' };
  }
  next();
}
// for integration later:
// function requireLogin(req, res, next) {
//   if (!req.session.user) {
//     return res.redirect('/login');
//   }
//   next();
// }



app.get('/', (req, res) => {
  res.redirect('/login');
});

app.get('/register', (req, res) => {
  res.render('pages/register', { layout: 'secondary', title: 'Register' });
});

app.post('/register', async (req, res) => {
  const { username , password } = req.body;

  try {
    const existingUser = await db.oneOrNone('SELECT * FROM users WHERE username = $1', [username]);

    if (existingUser) {
      return res.status(400).send('Username already exists. Try a different one.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.none('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hashedPassword]);

    console.log(`Registered new user: ${username}`);
    res.redirect('/login');

  } catch (err) {
    console.error('Error registering user:', err);
    res.status(500).send('Server error');
  }
});

app.get('/login', (req, res) => {
  res.render('pages/index', { layout: 'secondary', title: 'Login' });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // temporary bypass: if admin/admin, skip DB check
    if (username === 'admin' && password === 'admin') {
      req.session.user = { username: 'admin' };
      console.log('Logged in as admin (bypass)');
      return res.redirect('/prompts');
    }

    // otherwise, try real DB lookup
    const user = await db.oneOrNone('SELECT * FROM users WHERE username = $1', [username]);

    if (!user) {
      return res.status(401).send('Invalid username or password');
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).send('Invalid username or password');
    }

    req.session.user = { username: user.username };
    console.log(`User logged in: ${username}`);
    res.redirect('/prompts');

  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).send('Server error');
  }
});


app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
    }  
    res.redirect('/login');
  });
});

app.get('/home', requireLogin, (req, res) => {
  res.render('pages/feed', { title: 'Home' , username: req.session.user.username});
});

app.get('/profile', requireLogin, (req, res) => {
  res.render('pages/profile', { layout: 'main' , title: 'Profile' , username: req.session.user.username});
});

app.get('/feed', requireLogin, (req, res) => {
  const samplePosts = [
    { username: 'Anonymous', text: 'Feeling peaceful today.' },
    { username: 'Anonymous', text: 'Grateful for small moments.' }
  ];

  res.render('pages/feed', { 
    layout: 'main', 
    title: 'Feed', 
    username: req.session.user.username,
    posts: samplePosts // pass sample data to feed.hbs
  });
});



app.get('/friends', requireLogin, (req, res) => {
  res.render('pages/friends', {
    layout: 'main',
    title: 'Friends',
    username: req.session.user.username
  });
});

app.get('/prompts', requireLogin, (req, res) => {
  const prompts = [
    { title: 'Prompt One', text: 'What made you smile today?' },
    { title: 'Prompt Two', text: 'What’s something you learned recently?' },
    { title: 'Prompt Three', text: 'Describe a small win you had today.' }
  ];

  res.render('pages/prompts', {
    layout: 'secondary',
    title: 'Daily Prompts',
    username: req.session.user.username,
    prompts
  });
});


// Temporary "database"
let entries = [
  { title: 'First Entry', text: 'Started journaling today!'},
  { title: 'Second Entry', text: 'Feeling productive and creative.'}
];

//Journal list page
app.get('/journal', requireLogin, (req, res) => {
  res.render('pages/journal', {
    layout: 'main',
    entries, 
    title: 'My Journal',
    username: req.session.user.username
  });
});

// Add new entry form
app.get('/journal/new', (req,res) => {
  res.render('pages/newJournal', {layout: 'main'});
});

// temporary backend so the page doesnt crash when you save new journal entry
app.post('/journal/new', (req, res) => {
  const { title, text } = req.body;
  if (title && text) {
    entries.push({ title, text }); // temporarily store in memory
  }
  res.redirect('/journal');
});

// app.listen(3000);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});