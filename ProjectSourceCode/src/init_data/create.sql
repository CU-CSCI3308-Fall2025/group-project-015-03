DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE IF NOT EXISTS users (
    username VARCHAR(20) PRIMARY KEY,
    password VARCHAR(100) NOT NULL,
    pronouns VARCHAR(10),
    nickname VARCHAR(20),
    quote VARCHAR(50),
    pfp_link VARCHAR(50)
);

DROP TABLE IF EXISTS prompts CASCADE;
CREATE TABLE IF NOT EXISTS prompts (
    prompt_id SERIAL PRIMARY KEY,
    prompt_txt VARCHAR(100)
);

DROP TABLE IF EXISTS responses CASCADE;
CREATE TABLE IF NOT EXISTS responses (
    response_id SERIAL PRIMARY KEY,
    response_txt VARCHAR(500),
    username VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (username) REFERENCES users(username)  
);

DROP TABLE IF EXISTS journals CASCADE;
CREATE TABLE IF NOT EXISTS journals (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100),
    content TEXT,
    username VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (username) REFERENCES users(username)
);

DROP TABLE IF EXISTS friends CASCADE;
CREATE TABLE IF NOT EXISTS friends (
    username VARCHAR(20),
    friend VARCHAR(20),
    FOREIGN KEY (username) REFERENCES users(username),
    FOREIGN KEY (friend) REFERENCES users(username)
);

DROP TABLE IF EXISTS pending_friend_requests CASCADE;
CREATE TABLE IF NOT EXISTS pending_friend_requests (
   sender VARCHAR(20),
   receiver VARCHAR(20),
   FOREIGN KEY (sender) REFERENCES users(username),
   FOREIGN KEY (receiver) REFERENCES users(username)
);

DROP TABLE IF EXISTS responses_to_users CASCADE;
CREATE TABLE IF NOT EXISTS responses_to_users (
    username VARCHAR(20) NOT NULL,
    response_id INT NOT NULL,
    FOREIGN KEY (username) REFERENCES users(username),
    FOREIGN KEY (response_id) REFERENCES responses(response_id)
);
