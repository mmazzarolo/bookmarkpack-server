var request = require('supertest');
var app = require('../app.js');

describe('GET /account', function() {
  it('should return 401', function(done) {
    request(app)
    .get('/account')
    .expect(401, done);
  });
});

describe('GET /users/asdfasdf', function() {
  it('should return 404', function(done) {
    request(app)
      .get('/mazza')
      .expect(404, done);
  });
});

describe('GET /random-url', function() {
  it('should return 404', function(done) {
    request(app)
      .get('/random-url')
      .expect(404, done);
  });
});
