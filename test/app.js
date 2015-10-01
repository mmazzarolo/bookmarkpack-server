var request = require('supertest');
var app = require('../app.js');

describe('GET /api/v1/me', function() {
  it('should return 401', function(done) {
    request(app)
      .get('/api/v1/me')
      .expect(401, done);
  });
});

describe('GET /mazza', function() {
  it('should return 200 OK', function(done) {
    request(app)
      .get('/mazza')
      .expect(200, done);
  });
});

describe('GET /mazza/asdfasdfadsf', function() {
  it('should return 404', function(done) {
    request(app)
      .get('/mazza/asdfasdfadsf')
      .expect(404, done);
  });
});

describe('GET /random-url', function() {
  it('should return 404', function(done) {
    request(app)
      .get('/reset')
      .expect(404, done);
  });
});
