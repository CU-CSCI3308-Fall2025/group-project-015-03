const express = require('express'); // To build an application server or API
const app = express();
const handlebars = require('express-handlebars');
const Handlebars = require('handlebars');
const path = require('path');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');

const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: path.join(__dirname + '/src/views/layouts'),
  partialsDir: path.join(__dirname + '/src/views/partials'),
});

Handlebars.registerHelper('add', function (a, b) {
  return a + b;
});

Handlebars.registerHelper('truncate', function (text, length) {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
});

Handlebars.registerHelper('formatDate', function(date) {
  if (!date) return '';
  const utcDate = new Date(date);
  
  // Format it in MST timezone
  return utcDate.toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Denver'  // MST/MDT timezone
  });
});

Handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});

// database configuration
let db;

if (process.env.RENDER) {
  // Running on Render
  db = pgp({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
} else {
  // Local (Docker)
  db = pgp({
    host: 'db',
    port: 5432,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD
  });
}

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
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, 'src/resources')));

app.use(session({
  secret: 'tumble-stack-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.use(async (req, res, next) => {
  if (req.session?.user?.username) {
    try {
      const user = await db.one(
        'SELECT theme FROM users WHERE username = $1',
        [req.session.user.username]
      );
      
      res.locals.theme = user.theme || "pink";
      req.session.user.theme = user.theme;  // keep session synced
    } catch (err) {
      console.error("Theme middleware error:", err);
      res.locals.theme = "pink";
    }
  } else {
    res.locals.theme = "pink"; // default for guests
  }
  next();
});

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'public/images'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const username = req.session.user.username;
    cb(null, `${username}_profile${ext}`);
  }
});

const upload = multer({ storage: storage });

app.get('/', (req, res) => {
  res.redirect('/login');
});

app.get('/register', (req, res) => {
  res.render('pages/register', { layout: 'secondary', title: 'Register' });
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;

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
    res.render('pages/register', {
      layout: 'secondary',
      title: 'Register',
      errorMessage: 'Server error while registering',
      username
    });
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
      req.session.user = { username: 'admin', theme: "pink"  };
      console.log('Logged in as admin (bypass)');
      return res.redirect('/prompts');
    }

    // otherwise, try real DB lookup
    const user = await db.oneOrNone('SELECT * FROM users WHERE username = $1;', [username]);

    if (!user) {
      return res.render('pages/index', {
        layout: 'secondary',
        title: 'Login',
        errorMessage: 'Invalid username or password',
        username
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.render('pages/index', {
        layout: 'secondary',
        title: 'Login',
        errorMessage: 'Invalid username or password',
        username
      });
    }

    req.session.user = { username: user.username, theme: user.theme || "pink" };
    console.log(`User logged in: ${username}`);
    res.redirect('/prompts');

  } catch (err) {
    console.error('Error logging in:', err);
    res.render('pages/index', {
      layout: 'secondary',
      title: 'Login',
      errorMessage: 'Server error while logging in',
      username
    });
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

// =============================================
// FRIEND SYSTEM ROUTES
// =============================================
// These routes handle the backend friend system
// Tables used: friends, pending_friend_requests, users

// GET /friends - View friends page
app.get('/friends', requireLogin, async (req, res) => {
  const username = req.session.user.username;

  try {
    // Get user's current friends
    const friends = await db.any(
      `SELECT u.username, u.nickname, u.pronouns, u.quote, u.pfp_link
       FROM friends f
       JOIN users u ON f.friend = u.username
       WHERE f.username = $1`,
      [username]
    );

    // Get pending friend requests (received)
    const pendingRequests = await db.any(
      `SELECT u.username, u.nickname, u.pronouns, u.quote, u.pfp_link
       FROM pending_friend_requests p
       JOIN users u ON p.sender = u.username
       WHERE p.receiver = $1`,
      [username]
    );

    res.render('pages/friends', {
      layout: 'main',
      title: 'Friends',
      username,
      friends,
      pendingRequests
    });

  } catch (err) {
    console.error('Error loading friends page:', err);
    res.render('pages/friends', {
      layout: 'main',
      title: 'Friends',
      username,
      errorMessage: 'Failed to load friends',
      friends: [],
      pendingRequests: []
    });
  }
});

// POST /friends/request - Send a friend request
app.post('/friends/request', requireLogin, async (req, res) => {
  const sender = req.session.user.username;
  const { receiver } = req.body;

  try {
    // Check if already friends
    const alreadyFriends = await db.oneOrNone(
      `SELECT * FROM friends 
       WHERE (username = $1 AND friend = $2) 
          OR (username = $2 AND friend = $1)`,
      [sender, receiver]
    );

    if (alreadyFriends) {
      return res.status(400).json({ error: 'Already friends' });
    }

    // Check if request already exists
    const existingRequest = await db.oneOrNone(
      `SELECT * FROM pending_friend_requests 
       WHERE sender = $1 AND receiver = $2`,
      [sender, receiver]
    );

    if (existingRequest) {
      return res.status(400).json({ error: 'Request already sent' });
    }

    // Insert friend request
    await db.none(
      `INSERT INTO pending_friend_requests (sender, receiver) 
       VALUES ($1, $2)`,
      [sender, receiver]
    );

    console.log(`Friend request sent: ${sender} -> ${receiver}`);
    res.json({ success: true, message: 'Friend request sent' });

  } catch (err) {
    console.error('Error sending friend request:', err);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// POST /friends/accept - Accept a friend request
app.post('/friends/accept', requireLogin, async (req, res) => {
  const receiver = req.session.user.username;
  const { sender } = req.body;

  try {
    // Check if request exists
    const request = await db.oneOrNone(
      `SELECT * FROM pending_friend_requests 
       WHERE sender = $1 AND receiver = $2`,
      [sender, receiver]
    );

    if (!request) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    // Add both directions to friends table (bidirectional friendship)
    await db.none(
      `INSERT INTO friends (username, friend) VALUES ($1, $2), ($2, $1)`,
      [sender, receiver]
    );

    // Remove from pending requests
    await db.none(
      `DELETE FROM pending_friend_requests 
       WHERE sender = $1 AND receiver = $2`,
      [sender, receiver]
    );

    console.log(`Friend request accepted: ${sender} <-> ${receiver}`);
    res.json({ success: true, message: 'Friend request accepted' });

  } catch (err) {
    console.error('Error accepting friend request:', err);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

// POST /friends/reject - Reject a friend request
app.post('/friends/reject', requireLogin, async (req, res) => {
  const receiver = req.session.user.username;
  const { sender } = req.body;

  try {
    await db.none(
      `DELETE FROM pending_friend_requests 
       WHERE sender = $1 AND receiver = $2`,
      [sender, receiver]
    );

    console.log(`Friend request rejected: ${sender} -> ${receiver}`);
    res.json({ success: true, message: 'Friend request rejected' });

  } catch (err) {
    console.error('Error rejecting friend request:', err);
    res.status(500).json({ error: 'Failed to reject friend request' });
  }
});

// POST /friends/remove - Unfriend someone
app.post('/friends/remove', requireLogin, async (req, res) => {
  const username = req.session.user.username;
  const { friend } = req.body;

  try {
    // Remove both directions
    await db.none(
      `DELETE FROM friends 
       WHERE (username = $1 AND friend = $2) 
          OR (username = $2 AND friend = $1)`,
      [username, friend]
    );

    console.log(`Unfriended: ${username} <-> ${friend}`);
    res.json({ success: true, message: 'Friend removed' });

  } catch (err) {
    console.error('Error removing friend:', err);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

// GET /friends/search - Search for users to add as friends
app.get('/friends/search', requireLogin, async (req, res) => {
  const currentUser = req.session.user.username;
  const { query } = req.query;

  if (!query || query.trim().length < 2) {
    return res.json({ results: [] });
  }

  try {
    // Search for users (exclude current user)
    const users = await db.any(
      `SELECT username, nickname, pronouns, quote, pfp_link
       FROM users
       WHERE username != $1 
         AND (username ILIKE $2 OR nickname ILIKE $2)
       LIMIT 10`,
      [currentUser, `%${query}%`]
    );

    // For each user, check friendship status
    const results = await Promise.all(users.map(async (user) => {
      // Check if already friends
      const isFriend = await db.oneOrNone(
        `SELECT * FROM friends 
         WHERE username = $1 AND friend = $2`,
        [currentUser, user.username]
      );

      // Check if request pending
      const pendingRequest = await db.oneOrNone(
        `SELECT * FROM pending_friend_requests 
         WHERE sender = $1 AND receiver = $2`,
        [currentUser, user.username]
      );

      return {
        ...user,
        isFriend: !!isFriend,
        requestPending: !!pendingRequest
      };
    }));

    res.json({ results });

  } catch (err) {
    console.error('Error searching users:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/friendship-status/:username - Check friendship status with a user
app.get('/api/friendship-status/:username', requireLogin, async (req, res) => {
  const currentUser = req.session.user.username;
  const { username } = req.params;

  try {
    // Check if friends
    const isFriend = await db.oneOrNone(
      `SELECT * FROM friends 
       WHERE username = $1 AND friend = $2`,
      [currentUser, username]
    );

    // Check if request sent
    const requestSent = await db.oneOrNone(
      `SELECT * FROM pending_friend_requests 
       WHERE sender = $1 AND receiver = $2`,
      [currentUser, username]
    );

    // Check if request received
    const requestReceived = await db.oneOrNone(
      `SELECT * FROM pending_friend_requests 
       WHERE sender = $1 AND receiver = $2`,
      [username, currentUser]
    );

    res.json({
      isFriend: !!isFriend,
      requestSent: !!requestSent,
      requestReceived: !!requestReceived
    });

  } catch (err) {
    console.error('Error checking friendship status:', err);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

app.get('/profile', requireLogin, async (req, res) => {
  try {
    const username = req.session.user.username;
    const user = await db.one(
      'SELECT username, nickname, pronouns, quote, pfp_link, theme FROM users WHERE username = $1',
      [username]);
    const profilePic = user?.pfp_link || 'sun.png';

    res.render('pages/profile', {
      layout: 'main',
      title: 'Profile',
      username,
      nickname: user.nickname || '',
      pronouns: user.pronouns || '',
      quote: user.quote || '',
      profilePic,
      theme: user.theme || 'pink'
    });
  } catch (err) {
    console.error('Error loading profile:', err);
    res.render('pages/profile', {
      layout: 'main',
      title: 'Profile',
      username,
      errorMessage: 'Failed to load profile'
    });
  }
});

app.post('/profile/picture', requireLogin, upload.single('pfp'), async (req, res) => {
  const username = req.session.user.username;
  if (!req.file) {
    return res.redirect('/profile'); // no file selected
  }

  const pfp_link = `${req.file.filename}`;

  try {
    await db.none('UPDATE users SET pfp_link = $1 WHERE username = $2', [pfp_link, username]);
    console.log(`Profile picture updated for ${username}`);
    res.redirect('/profile');
  } catch (err) {
    console.error('Error updating profile picture:', err);
    res.render('pages/profile', {
      layout: 'main',
      title: 'Profile',
      username,
      errorMessage: 'Failed to update profile picture'
    });
  }
});


app.post('/profile/edit', requireLogin, async (req, res) => {
  const { nickname, pronouns, quote, theme } = req.body;
  const username = req.session.user.username;

  try {
    await db.none(
      `UPDATE users
       SET nickname = $1,
           pronouns = $2,
           quote = $3,
           theme = $4
       WHERE username = $5`,
      [nickname, pronouns, quote, theme, username]
    );

    res.redirect('/profile');
  } catch (err) {
    console.error('Error updating profile info:', err);
    res.render('pages/profile', {
      layout: 'main',
      title: 'Profile',
      username,
      nickname,
      pronouns,
      quote,
      errorMessage: 'Failed to update profile info'
    });
  }
});


// =============================================
// FEED ROUTE - Show daily prompt responses
// =============================================
// Shows responses from friends first, then others
// Allows filtering by specific prompt (tab system)

app.get('/feed', requireLogin, async (req, res) => {
  const username = req.session.user.username;
  const { prompt_filter } = req.query; // Optional: filter by specific prompt

  try {
    // Get today's prompts for the tab system
    const date = new Date();
    const day = date.getDate();
    const start_index = (day % 7) * 3;
    const end_index = start_index + 2;

     const todaysPrompts = await db.any(
      `SELECT prompt_id, prompt_txt FROM prompts 
       WHERE prompt_id >= $1 AND prompt_id <= $2`,
      [start_index, end_index]
    );

    // Convert prompt_filter to integer for comparison
    const promptFilterInt = prompt_filter ? parseInt(prompt_filter) : null;

    // Get user's friends list
    const friends = await db.any(
      `SELECT friend FROM friends WHERE username = $1`,
      [username]
    );
    const friendUsernames = friends.map(f => f.friend);

    // Build query to get responses
    let responsesQuery = `
      SELECT 
        r.response_id,
        r.response_txt,
        r.created_at,
        r.username,
        r.prompt_id,
        p.prompt_txt,
        u.nickname,
        u.pronouns,
        u.quote,
        u.pfp_link,
        CASE WHEN r.username = ANY($1::text[]) THEN true ELSE false END as is_friend
      FROM responses r
      JOIN users u ON r.username = u.username
      JOIN prompts p ON r.prompt_id = p.prompt_id
      WHERE r.prompt_id >= $2 AND r.prompt_id <= $3
    `;

    const queryParams = [friendUsernames.length > 0 ? friendUsernames : [''], start_index, end_index];

    // If filtering by specific prompt
    if (prompt_filter) {
      responsesQuery += ` AND r.prompt_id = $4`;
      queryParams.push(prompt_filter);
    }

    // Order: friends first, then by most recent
    responsesQuery += ` ORDER BY is_friend DESC, r.created_at DESC`;

    const responses = await db.any(responsesQuery, queryParams);

    // Get like counts for each response
    const responsesWithLikes = await Promise.all(responses.map(async (response) => {
      const likeCount = await db.one(
        `SELECT COUNT(*) as count FROM likes WHERE post_id = $1`,
        [response.response_id]
      );

      const userLiked = await db.oneOrNone(
        `SELECT * FROM likes WHERE post_id = $1 AND username = $2`,
        [response.response_id, username]
      );

      return {
        ...response,
        like_count: parseInt(likeCount.count),
        user_liked: !!userLiked
      };
    }));

    res.render('pages/feed', {
      layout: 'main',
      title: 'Feed',
      username,
      responses: responsesWithLikes,
      prompts: todaysPrompts,
      currentPromptFilter: promptFilterInt
    });

  } catch (err) {
    console.error('Error loading feed:', err);
    res.render('pages/feed', {
      layout: 'main',
      title: 'Feed',
      username,
      responses: [],
      prompts: [],
      errorMessage: 'Failed to load feed'
    });
  }
});

// POST /feed/like - Like a post
app.post('/feed/like', requireLogin, async (req, res) => {
  const username = req.session.user.username;
  const { post_id } = req.body;

  try {
    // Check if already liked
    const existing = await db.oneOrNone(
      `SELECT * FROM likes WHERE post_id = $1 AND username = $2`,
      [post_id, username]
    );

    if (existing) {
      // Unlike
      await db.none(
        `DELETE FROM likes WHERE post_id = $1 AND username = $2`,
        [post_id, username]
      );
      res.json({ liked: false });
    } else {
      // Like
      await db.none(
        `INSERT INTO likes (post_id, username) VALUES ($1, $2)`,
        [post_id, username]
      );
      res.json({ liked: true });
    }

  } catch (err) {
    console.error('Error toggling like:', err);
    res.status(500).json({ error: 'Failed to like post' });
  }
});

// POST /feed/comment - Add a comment to a post
app.post('/feed/comment', requireLogin, async (req, res) => {
  const username = req.session.user.username;
  const { post_id, comment_txt } = req.body;

  try {
    await db.none(
      `INSERT INTO comments (post_id, username, comment_txt) 
       VALUES ($1, $2, $3)`,
      [post_id, username, comment_txt]
    );

    console.log(`Comment added by ${username} on post ${post_id}`);
    res.json({ success: true });

  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// GET /feed/comments/:post_id - Get comments for a post
app.get('/feed/comments/:post_id', requireLogin, async (req, res) => {
  const { post_id } = req.params;

  try {
    const comments = await db.any(
      `SELECT 
        c.comment_id,
        c.comment_txt,
        c.created_at,
        c.username,
        u.nickname,
        u.pfp_link
       FROM comments c
       JOIN users u ON c.username = u.username
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC`,
      [post_id]
    );

    res.json({ comments });

  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// GET /api/user/:username - Get user profile info (for modal)
app.get('/api/user/:username', requireLogin, async (req, res) => {
  const { username } = req.params;

  try {
    const user = await db.oneOrNone(
      `SELECT username, nickname, pronouns, quote, pfp_link 
       FROM users WHERE username = $1`,
      [username]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });

  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.get('/friends', requireLogin, (req, res) => {
  res.render('pages/friends', {
    layout: 'main',
    title: 'Friends',
    username: req.session.user.username
  });
});

app.get('/prompts', requireLogin, async (req, res) => {
  const username = req.session.user.username;
  const date = new Date();
  const day = date.getDate();
  const start_index = (day % 7) * 3;
  const end_index = start_index + 2;

  try {
    // Get today's prompts
    const promptsQuery = `
      SELECT prompt_id, prompt_txt
      FROM prompts
      WHERE prompt_id >= $1 AND prompt_id <= $2
    `;
    const todaysPrompts = await db.any(promptsQuery, [start_index, end_index]);

    // Check if user has already answered today's prompts
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const answeredQuery = `
      SELECT COUNT(*) as count
      FROM responses
      WHERE username = $1 
        AND prompt_id >= $2 
        AND prompt_id <= $3
        AND created_at >= $4
    `;

    const answeredResult = await db.one(answeredQuery, [
      username,
      start_index,
      end_index,
      today
    ]);

    const answeredCount = parseInt(answeredResult.count);
    const totalPrompts = todaysPrompts.length;

    // If they've answered all prompts today, redirect to feed
    if (answeredCount >= 1) {
      console.log(`${username} has already answered today's prompts, redirecting to feed`);
      return res.redirect('/feed');
    }

    // Otherwise, show prompts page
    const prompts = todaysPrompts.map((row, i) => ({
      title: `Prompt ${i + 1}`,
      text: row.prompt_txt,
      id: row.prompt_id
    }));

    return res.render('pages/prompts', {
      layout: 'secondary',
      title: 'Daily Prompts',
      username,
      prompts,
      answeredCount, // Pass this to show progress
      totalPrompts,
      errorMessage: null
    });

  } catch (err) {
    console.error("Error loading prompts:", err);

    return res.render('pages/prompts', {
      layout: 'secondary',
      title: 'Daily Prompts',
      username,
      prompts: [],
      errorMessage: 'Failed to load prompts'
    });
  }
});


// Add new entry form
app.get('/prompts/answer', async (req, res) => {
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
      res.render('pages/newResponse', {
        layout: 'main',
        username: req.session.user.username,
        errorMessage: 'Failed to load prompt'
      });
  }
});

app.post('/prompts/answer', requireLogin, async (req, res) => {
  const { text, prompt_id } = req.body;
  const username = req.session.user.username;

  try {
    await db.none(
      `INSERT INTO responses (response_txt, username, prompt_id)
       VALUES ($1, $2, $3);`,
      [text, username, prompt_id]
    );

    res.redirect('/feed');
  } catch (err) {
    console.error(err);
    res.render('pages/newResponse', {
      layout: 'main',
      username,
      errorMessage: 'Failed to submit your response',
      prompt: { prompt_id, text }
    });
  }
});


app.get('/journal', requireLogin, async (req, res) => {
  const username = req.session?.user?.username;

  try {
    // Daily prompt-based entries (from responses table)
    const dailyEntries = await db.any(
      `SELECT 
        response_id AS id, 
        response_txt AS content,
        created_at,
        'Daily Entry' AS title,
        NULL AS type,
        p.prompt_txt AS prompt_text
       FROM responses r
       LEFT JOIN prompts p ON r.prompt_id = p.prompt_id
       WHERE r.username = $1
       ORDER BY created_at DESC`,
      [username]
    );

    // Journal entries (from journals table)
    const journalEntries = await db.any(
      `SELECT 
        id, 
        title, 
        content, 
        created_at,
        type,
        prompt_topic,
        prompt_text
       FROM journals
       WHERE username = $1
       ORDER BY created_at DESC`,
      [username]
    );

    // Combine and sort by date
    const allEntries = [...dailyEntries, ...journalEntries]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.render('pages/journal', {
      layout: 'main',
      title: 'My Journal',
      username,
      entries: allEntries
    });

  } catch (err) {
    console.error('Error loading journal page:', err);
    res.render('pages/journal', {
      layout: 'main',
      title: 'My Journal',
      username,
      entries: [],
      errorMessage: 'Failed to load journal entries.'
    });
  }
});



app.get('/journal/new', (req, res) => {
  res.render('pages/newJournal', { layout: 'main' });
});


app.post('/journal/new', requireLogin, async (req, res) => {
  const { title, content, type } = req.body;
  const username = req.session?.user?.username;

  try {
    await db.none(
      `INSERT INTO journals (title, content, username, type) 
       VALUES ($1, $2, $3, $4)`,
      [title || 'Untitled Entry', content, username, type || 'quick']
    );

    console.log(`Journal entry saved for ${username}`);
    res.redirect('/journal');

  } catch (err) {
    console.error('Error inserting journal entry:', err);
    res.status(500).render('pages/journal', {
      layout: 'main',
      title: 'My Journal',
      username,
      errorMessage: 'Failed to save journal entry.',
      entries: []
    });
  }
});

// POST /journal/guided - Guided prompt entry
app.post('/journal/guided', requireLogin, async (req, res) => {
  const { content, prompt_topic, prompt_text } = req.body;
  const username = req.session?.user?.username;

  // Generate title from topic
  const topicTitles = {
    anxious: 'Anxiety Reflection',
    grateful: 'Gratitude Entry',
    goals: 'Goals & Growth',
    reflective: 'Self-Reflection',
    happy: 'Celebration Entry'
  };

  const title = topicTitles[prompt_topic] || 'Guided Entry';

  try {
    await db.none(
      `INSERT INTO journals (title, content, username, type, prompt_topic, prompt_text) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [title, content, username, 'guided', prompt_topic, prompt_text]
    );

    console.log(`Guided journal entry saved for ${username} (topic: ${prompt_topic})`);
    res.redirect('/journal');

  } catch (err) {
    console.error('Error inserting guided journal entry:', err);
    res.status(500).render('pages/journal', {
      layout: 'main',
      title: 'My Journal',
      username,
      errorMessage: 'Failed to save guided entry.',
      entries: []
    });
  }
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV != 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on post ${PORT}`);
  });
}

module.exports = app;
