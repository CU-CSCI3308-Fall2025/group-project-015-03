DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE IF NOT EXISTS users (
    username VARCHAR(20) PRIMARY KEY,
    password VARCHAR(30) NOT NULL
);

DROP TABLE IF EXISTS prompts CASCADE;
CREATE TABLE IF NOT EXISTS prompts (
    prompt_id INT PRIMARY KEY SERIAL,
    prompt_txt VARCHAR(50);
);

DROP TABLE IF EXISTS responses CASCADE;
CREATE TABLE IF NOT EXISTS responses (
    response_id INT PRIMARY KEY SERIAL,
    response_txt VARCHAR(500),
    FOREIGN KEY (user) references users(username)  
);

DROP TABLE IF EXISTS responses_to_users CASCADE;
CREATE TABLE IF NOT EXISTS response_to_users (
    username VARCHAR(20) PRIMARY KEY,
    response_id INT NOT NULL
    FOREIGN KEY username REFERENCES users(username),
    FOREIGN KEY response_id REFERENCES responses(response_id)
);

DROP TABLE IF EXISTS responses_to_prompts;
CREATE TABLE IF NOT EXISTS responses_to_prompts (
    response_id INT NOT NULL,
    prompt_id INT NOT NULL,
    FOREIGN KEY response_id REFERENCES responses(response_id),
    FOREIGN KEY prompt_id REFERENCES prompts(prompt_id)
);
