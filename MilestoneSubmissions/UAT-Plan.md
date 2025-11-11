##### **Feature 1: User Registration**



###### **Feature Description:**

Allows new users to create an account using a unique username. The information should be stored in the users table in the DB. 



###### **Testing Environment:**

Environment: localhost via Docker

URL: http://localhost:3000/register

Database: PostgreSQL (tumble\_stack)



###### **Test Data:**

**Username		Password			Expected Result**

test			testing123			Registration successful

test			testing123			Registration error (duplicate username)



###### **Test Cases:**

**Description			Steps						Expected Outcome**

Register with valid inputs	1. Go to /register page				User is redirected to /login and

&nbsp;				2. Enter unique username w/ a password		info is saved in DB

&nbsp;				3. Click Register				



Register with existing		1. Attempt to register again using		Website displays error: "Username

username			the same username				already exists" and user is not created

&nbsp;				2. Click Register				 



Submit form with empty fields	1. Leave one or more fields blank		Website displays form validation error

&nbsp;				2. Click Register				and form does not submit.



###### **Acceptance Criteria:**

1. Registration succeeds with a valid and unique username
2. Registration fails with duplicate usernames or empty fields
3. Database table users correctly reflects new registrations



###### **Expected Test Result:**

All successful registrations appear in the users table and duplicate or invalid attempts are rejected with an appropriate error message. 



###### **Testers:**

All four of us working on the project will be testing these, with two representing the development team and the other two representing end users who are in our target audience (college students). 



##### **Feature 2: User Login**



###### **Feature Description:**

Existing users can log into the application using valid credentials. If incorrect credentials are provided, login should fail and give an appropriate error message.



###### **Testing Environment:**

Environment: localhost via Docker

URL: http://localhost:3000/login

Database: PostgreSQL (tumble\_stack)



###### **Test Data:**

**Username		Password			Expected Result**

test			testing123			Login Success

test			incorrectpassword		Login Fails

testing			testing123			Login Fails



###### **Test Cases:**

**Description			Steps						Expected Outcome**

Successful login		1. Go to /login					User redirected to /prompts

&nbsp;				2. Enter valid credentials			and a new session is created.

&nbsp;				3. Click Login



Invalid password		1. Enter correct username and			Login Fails and return with an error message

&nbsp;				incorrect password				that says "Invalid username or password"

&nbsp;				2. Click Login



Unregistered user		1. Enter random username \& password		Login fails and return with an error message

&nbsp;				2. Click Login					that says "Invalid username or password"



###### **Acceptance Criteria:**

1. Login only succeeds for valid credentials
2. Failed logins do not create a new session
3. Proper error messages displayed for incorrect credentials



###### **Expected Test Result:**

Users can successfully login with correct credentials and a new session is created while invalid attempts are rejected. 



###### **Testers:**

All four of us working on the project will be testing these, with two representing the development team and the other two representing end users who are in our target audience (college students).





##### **Feature 3: Journal Entry Creation**



###### **Feature Description:**

Logged-in users can create new journal entries with a title and text. Entries appear on the user's journal feed and should have both a title and text. 



###### **Testing Environment:**

Environment: localhost via Docker

URL: http://localhost:3000/journal/new

Database: PostgreSQL (tumble\_stack)



###### **Test Data:**

**Title		Text					Expected Result**

Entry 1		Testing journal entry feature		New entry appears in /journal list



###### **Test Cases:**

**Description			Steps						Expected Outcome**

Create new entry		1. Login and go to /journal/new			Entry appears in /journal feed

&nbsp;				2. Enter title and text \& submit



Submit empty fields		1. Login and go to /journal/new			Website prevents submission and displays

&nbsp;				2. Leave title or text blank \& submit		an error message



View existing entries		1. Go to /journal after	creating entries	Entries persist in the list





###### **Acceptance Criteria:**

1. Journal entries appear immediately after submission
2. Empty submissions are blocked
3. Entries are stored and retrievable from the DB



###### **Expected Test Result:**

All valid entries display in the journal feed after submission and empty submissions return the proper error message.



###### **Testers:**

All four of us working on the project will be testing these, with two representing the development team and the other two representing end users who are in our target audience (college students).





