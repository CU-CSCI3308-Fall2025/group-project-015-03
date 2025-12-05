// ********************** Initialize server **********************************

const server = require('../index.js'); //TODO: Make sure the path to your index.js is correctly added

// ********************** Import Libraries ***********************************

const chai = require('chai'); // Chai HTTP provides an interface for live integration testing of the API's.
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
const {assert, expect} = chai;

// *********************** TODO: WRITE 2 UNIT TESTCASES **************************

describe('Testing /register API (Positive)', () => {
  it('Positive: should register a new user successfully', done => {
    chai
      .request(server)
      .post('/register')
      .send({
        username: 'test' + Date.now(),
        password: 'testing123'
      })
      .end((err, res) => {
        expect([200, 302]).to.include(res.status);
        if (res.status === 302) {
          res.should.redirectTo(/^.*\/login$/);
        }

        done();
      });
  });
});


describe('Testing /register API (Negative)', () => {
  it('Negative: should return 400 for duplicate username', done => {
    const existingUser = 'duplicateUser';

    chai
      .request(server)
      .post('/register')
      .send({ username: existingUser, password: 'password123' })
      .end((err, res) => {
        expect([200, 302]).to.include(res.status);
        
        chai
          .request(server)
          .post('/register')
          .send({ username: existingUser, password: 'password123' })
          .end((err, res) => {
            expect(res).to.have.status(400);
            expect(res.text).to.include('Username already exists');
            done();
          });
      });
  });
});

describe('Testing /login API (Positive)', () => {
  it('Positive: should login successfully with valid credentials', done => {
    const username = 'test' + Date.now();
    const password = 'testing123';

    chai
      .request(server)
      .post('/register')
      .send({ username, password })
      .end((err, res) => {
        expect([200, 302]).to.include(res.status);

        chai
          .request(server)
          .post('/login')
          .send({ username, password })
          .end((err, res) => {
            expect([200, 302]).to.include(res.status);
            if (res.status === 302) {
              res.should.redirectTo(/^.*\/prompts$/);
            }
            done();
          });
      });
  });
});

describe('Testing /login API (Negative)', () => {
  it('Negative: should fail login with incorrect password', done => {
    const username = 'test' + Date.now();
    const password = 'testing123';
    const wrongPassword = 'testing';

    // Create user
    chai
      .request(server)
      .post('/register')
      .send({ username, password })
      .end((err, res) => {
        expect([200, 302]).to.include(res.status);

        // Attempt login with wrong password
        chai
          .request(server)
          .post('/login')
          .send({ username, password: wrongPassword })
          .end((err, res) => {
            expect(res).to.have.status(401);
            expect(res.text).to.include('Invalid username or password');
            done();
          });
      });
  });

  it('Negative: should fail login for non-existent username', done => {
    chai
      .request(server)
      .post('/login')
      .send({ username: 'testing' + Date.now(), password: 'testing123' })
      .end((err, res) => {
        expect(res).to.have.status(401);
        expect(res.text).to.include('Invalid username or password');
        done();
      });
  });

  it('Negative: should fail login when fields are empty', done => {
    chai
      .request(server)
      .post('/login')
      .send({ username: '', password: '' })
      .end((err, res) => {
        // Depending on implementation, could be 400 or 401
        expect([400, 401]).to.include(res.status);
        done();
      });
  });
});

// Helper to register + login quickly
async function createAndLoginUser() {
  const username = 'user' + Date.now();
  const password = 'testing123';

  // Register
  await chai.request(server).post('/register').send({ username, password });

  // Login (keep cookie)
  const agent = chai.request.agent(server);
  await agent.post('/login').send({ username, password });

  return agent;
}

describe('Journal Entry Feature Tests', () => {

  // -------------------------
  // POSITIVE TEST CASES
  // -------------------------

  it('JE-P1: Should create a new quick-entry journal successfully', async () => {
    const agent = await createAndLoginUser();

    const res = await agent
      .post('/journal/new')
      .send({
        title: 'My Test Entry',
        content: 'This is a test journal entry',
        type: 'quick'
      });

    expect([200, 302]).to.include(res.status);
    res.should.redirectTo(/\/journal$/);
  });

  it('JE-P2: Should create entry with default title when title is blank', async () => {
    const agent = await createAndLoginUser();

    await agent
      .post('/journal/new')
      .send({
        title: '',
        content: 'Entry without a title',
        type: 'quick'
      });

    const journal = await agent.get('/journal');
    expect(journal.text).to.include('Untitled Entry');
    expect(journal.status).to.equal(200);
  });

  it('JE-P3: Should create a guided journal entry successfully', async () => {
    const agent = await createAndLoginUser();

    const res = await agent
      .post('/journal/guided')
      .send({
        prompt_topic: 'grateful',
        prompt_text: 'What are three things I am grateful for?',
        content: 'I am grateful for sunshine.',
      });

    expect([200, 302]).to.include(res.status);

    const journal = await agent.get('/journal');
    expect(journal.text).to.include('Guided Entry');
    expect(journal.text).to.include('sunshine');
  });

  // -------------------------
  // NEGATIVE TEST CASES
  // -------------------------

  it('JE-N1: Should refuse journal entry with empty content', async () => {
    const agent = await createAndLoginUser();

    const res = await agent
      .post('/journal/new')
      .send({
        title: 'Title Here',
        content: '', // invalid
        type: 'quick'
      });

    // backend inserts empty content unless DB prevents it
    // We check that page includes error text instead of redirect.
    expect([400, 500]).to.include(res.status);
  });

  it('JE-N2: Guided entry should fail when prompt not selected', async () => {
    const agent = await createAndLoginUser();

    const res = await agent
      .post('/journal/guided')
      .send({
        prompt_topic: 'grateful',
        prompt_text: '',     // missing prompt
        content: 'Thankful text'
      });

    expect([400, 500]).to.include(res.status);
  });

  it('JE-N3: Should block /journal/new for logged-out users', async () => {
    const res = await chai.request(server).get('/journal/new');
    expect([200]).to.include(res.status);
    res.should.redirectTo(/\/login$/);
  });

  it('JE-N4: Should return an error for invalid DB payload', async () => {
    const agent = await createAndLoginUser();

    const res = await agent
      .post('/journal/new')
      .send({
        // Missing 'content' entirely
        title: 'Bad Payload',
        type: 'quick'
      });

    expect([400, 500]).to.include(res.status);
  });

});


// ********************************************************************************