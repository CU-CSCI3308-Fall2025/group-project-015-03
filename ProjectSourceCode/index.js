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
    return res.redirect('/login');
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
    const existingUser = await db.oneOrNone('SELECT * FROM users WHERE username = $1;', [username]);

    if (existingUser) {
      return res.status(400).send('Username already exists. Try a different one.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.none('INSERT INTO users (username, password) VALUES ($1, $2);', [username, hashedPassword]);

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
    const user = await db.oneOrNone('SELECT * FROM users WHERE username = $1;', [username]);

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

// TEMPORARY fake login for testing
// app.get('/fake-login', (req, res) => {
//   req.session = req.session || {};
//   req.session.user = { username: 'maya' }; // pretend this user is logged in
//   console.log('✅ fake login activated for', req.session.user.username);
//   res.redirect('/feed'); // or '/journal' or '/home'
// });

app.get('/profile', requireLogin, (req, res) => {
  res.render('pages/profile', { layout: 'main' , title: 'Profile' , username: req.session.user.username});
});

app.get('/feed', requireLogin, (req, res) => {
  const samplePosts = [
    { username: 'Alice', text: 'Feeling peaceful today.' },
    { username: 'Bob', text: 'Grateful for small moments.' },
    { username: 'Anonymous', text: 'Trying to stay motivated.' },
    { username: 'Anonymous', text: 'Today I took a long walk and it helped me think.' }
  ];

  res.render('pages/feed', { 
    layout: 'main', 
    title: 'Feed', 
    username: req.session.user.username,
    posts: samplePosts
  });
});

app.get('/friends', requireLogin, async (req, res) => {
  const currentUser = req.session.user.username;
  const query = 'SELECT friend FROM friends WHERE username = $1;';
  let results;
  try {
    results = await db.any(query, [currentUser]);
    res.render('pages/friends', {
      layout: 'main',
      title: 'Friends',
      username: req.session.user.username,
      results: results
    });
  }
  catch (err) {
      console.error(err),
      res.status(400).json({
      error: err,
    });
  }
});

app.get('/friends/list', requireLogin, async (req, res) => {
  const currentUser = req.session.user.username;
  const query = 'SELECT username FROM users WHERE username = $1;';
  try {
    const results = await db.any(query, [currentUser]);
    res.json(results);
  }
  catch (err) {
      console.error(err),
      res.status(400).json({
      error: err,
    });
  }
});

app.get('/friends/search', requireLogin, async (req, res) => {
  const currentUser = req.session.user.username;
  const search = req.query.q || "";
  const query = 'SELECT username, quote FROM users WHERE username ILIKE $1 AND username != $2' 
    + 'AND username NOT IN (SELECT friend FROM friends WHERE username = $2);';
  try {
    let results = await db.any(query, [`%${search}%`, currentUser]);
    res.json(results);
  }
  catch (err) {
      console.error(err),
      res.status(400).json({
      error: err,
    });
  }
});

app.post("/friends/add", requireLogin, async (req, res) => {
  const username = req.session.user.username;
  const friendToRequest = req.body.friend.username;

  const query = 'INSERT INTO pending_friend_requests(sender, reciever) values ($1, $2);';
  try {
    await db.none(query, [username, friendToRequest]);
    res.json({success: true});
  }
  catch (err ){
      console.error(err),
      res.status(400).json({
      error: err,
    });
  }
});

app.delete("/friends/remove:username", requireLogin, async (req, res) => {
  const currentUser = req.session.user.username;
  const friendToRemove = req.params.username;
  const query = 'DELETE FROM friends WHERE username = $1 AND friend = $2;';
  
  try {
    await db.none(query, [currentUser, friendToRemove]);
    await db.none(query, [friendToRemove, currentUser]);
    res.json({ success: true});
  }
  catch (err) {
      console.error(err),
      res.status(400).json({
      error: err,
    });
  }
});

app.get('/prompts', requireLogin, async (req, res) => {
  const date = new Date();
  const day = date.getDate();
  const start_index = (day % 7) * 3;
  const end_index = start_index + 2;
  const query = 'SELECT * FROM prompts WHERE prompt_id >= $1 AND prompt_id <= $2;';
  let prompts = [];
  try {
    let results = await db.any(query, [start_index, end_index]);
    prompts = results;
    for (let i = 0; i < 3; i++) {
      prompts[i].title = i;
      prompts[i].text = results[i].prompt_txt; 
      prompts[i].id = results[i].prompt_id;
    }
  }
  catch (err) {
    console.error(err),
    res.status(400).json({
      error: err,
    });
  }
  res.render('pages/prompts', {
    layout: 'secondary',
    title: 'Daily Prompts',
    username: req.session.user.username,
    prompts
  });
});

// Add new entry form
app.get('/prompts/answer', async(req,res) => {
  const prompt_id = req.query.prompt_id;
  const query = 'SELECT * FROM prompts WHERE prompt_id = $1;';
  try {
    const prompt = await db.one(query, [prompt_id]);
    res.render('pages/newResponse', {
      layout: 'main',
      username: req.session.user.username,
      prompt
    });
  }
  catch (err) {
    console.error(err),
    res.status(400).json({
      error: err,
    });
  }
});

app.post('/prompts/answer', async (req, res) => {
  const {text, prompt_id, username} = req.body;
  const query = 'INSERT INTO responses(response_txt, username) VALUES ($1, $2);';
  try {
    await db.none(query, [text, req.session.user.username]);
    res.render('pages/feed');
  }
  catch (err) {
    console.error(err),
    res.status(400).json({
      error: err,
    });
  }
});


// Temporary "database"
let entries = [
  { title: 'First Entry', text: 'Started journaling today!'},
  { title: 'Second Entry', text: 'Feeling productive and creative.'}
];

app.get('/journal', async (req, res) => {
  try {
    const entries = await db.any('SELECT * FROM journals ORDER BY created_at DESC');
    res.render('pages/journal', {
      layout: 'main',
      title: 'My Journal Entries',
      entries
    });
  } catch (err) {
    console.error('Error loading journal entries:', err);
    res.status(500).send('Database read error');
  }
});

app.get('/journal/new', (req, res) => {
  res.render('pages/newJournal', { layout: 'main' });
});


app.post('/journal/new', async (req, res) => {
  const { title, text } = req.body;
  const username = req.session?.user?.username;

  try {
    await db.none(
        'INSERT INTO journals (title, content, username) VALUES ($1, $2, $3)',
        [title, text, username]
    );
    console.log('✅ Journal entry saved:', title);
    res.redirect('/journal');
  } catch (err) {
    console.error(' Error inserting journal entry:', err);
    res.status(500).send('Database insert error');
  }
});



const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV != 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on post ${PORT}`);
  });
}

module.exports = app;
