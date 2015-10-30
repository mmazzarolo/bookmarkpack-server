var request = require('supertest')
var chai = require('chai')
var should = chai.should()

var app = require('../../app.js')
var User = require('../../models/User')

var user1 = {
  username: 'alpha',
  email: 'alpha@gmail.com',
  password: 'asdf'
}
var token
var bookmarkId

/**
 * Routes test.
 */
describe('GET /account', function() {
  it('should return 401', function(done) {
    request(app)
    .get('/account')
    .expect(401, done)
  })
})

describe('GET /users/asdfasdf', function() {
  it('should return 404', function(done) {
    request(app)
      .get('/mazza')
      .expect(404, done)
  })
})

describe('GET /random-url', function() {
  it('should return 404', function(done) {
    request(app)
      .get('/random-url')
      .expect(404, done)
  })
})
