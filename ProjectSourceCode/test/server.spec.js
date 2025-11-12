// ********************** Initialize server **********************************

const server = require('../index.js'); //TODO: Make sure the path to your index.js is correctly added

// ********************** Import Libraries ***********************************

const chai = require('chai'); // Chai HTTP provides an interface for live integration testing of the API's.
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
const {assert, expect} = chai;

// ********************** DEFAULT WELCOME TESTCASE ****************************

describe('Server!', () => {
  // Sample test case given to test / endpoint.
  it('Returns the default welcome message', done => {
    chai
      .request(server)
      .get('/welcome')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals('success');
        assert.strictEqual(res.body.message, 'Welcome!');
        done();
      });
  });
});

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
        expect(res).to.have.status(200).or.have.status(302);
        
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

// ********************************************************************************