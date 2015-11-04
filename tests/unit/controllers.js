var request = require('supertest')
var chai = require('chai')
var should = chai.should()

var app = require('../../server.js')
var User = require('../../models/User')

var user1 = {
  username: 'test001',
  email: 'test001@gmail.com',
  password: 'asdf'
}
var token
var bookmarkId

/**
 * User signup.
 */
describe('POST /auth/signup', function() {
  it('should return 200', function(done) {
    request(app)
      .post('/auth/signup')
      .send(user1)
      .expect(200, done)
  })
})

/**
 * User login.
 */
describe('POST /auth/login', function() {
  it('should return 200', function(done) {
    request(app)
      .post('/auth/login')
      .send({ email: 'test001@gmail.com', password: 'asdf' })
      .expect(200)
      .end(function(err, res) {
        if (err) done(err)
        token = res.body.token
        res.body.should.have.property('token')
        done()
      })
  })
})

/**
 * Change password without validation.
 */
describe('POST /account/password', function() {
  it('should return 403', function(done) {
    request(app)
      .post('/account/password')
      .set('Authorization', 'Bearer ' + token)
      .send({ oldPassword: 'asdf', newPassword: 'fdsa' })
      .expect(403, done)
  })
})

/**
 * Change email without validation.
 */
describe('POST /account/email', function() {
  it('should return 403', function(done) {
    request(app)
      .post('/account/email')
      .set('Authorization', 'Bearer ' + token)
      .send({ email: 'asdf@gmail.com', password: 'asdf' })
      .expect(403, done)
  })
})

/**
 * User validation.
 */
describe('POST /auth/verify', function() {
  it('should return 200', function(done) {
    request(app)
      .post('/auth/verify')
      .send({ email: 'test001@gmail.com' })
      .expect(200, done)
  })
})

describe('User validation', function() {
  it('should validate user by email', function(done) {
    User.findOne({ email: 'test001@gmail.com' }, function(err, user) {
      if (err) return done(err)
      user.verified.should.equal(false)
      user.verified = true
      user.save(function(err) {
        if (err) return next(err)
        done()
      })
    })
  })
})

/**
 * Change password with validation.
 */
describe('POST /account/password', function() {
  it('should return 200', function(done) {
    request(app)
      .post('/account/password')
      .set('Authorization', 'Bearer ' + token)
      .send({ oldPassword: 'asdf', newPassword: 'fdsa' })
      .expect(200, done)
  })
})

/**
 * Change email with validation.
 */
describe('POST /account/email', function() {
  it('should return 200', function(done) {
    request(app)
      .post('/account/email')
      .set('Authorization', 'Bearer ' + token)
      .send({ email: 'test0012@gmail.com', password: 'fdsa' })
      .expect(200, done)
  })
})

/**
 * Get user without authorization token.
 */
describe('GET /user', function() {
  it('should return 401', function(done) {
    request(app)
      .get('/user')
      .expect(401, done)
  })
})

/**
 * Create a new bookmark.
 */
describe('POST /user/bookmarks', function() {
  it('should return 200', function(done) {
    request(app)
      .post('/user/bookmarks')
      .set('Authorization', 'Bearer ' + token)
      .send({ url: 'http://stackoverflow.com/' })
      .expect(200, done)
  })
})

/**
 * Get user.
 */
describe('GET /user/bookmarks', function() {
  it('should return 200', function(done) {
    request(app)
      .get('/user/bookmarks')
      .set('Authorization', 'Bearer ' + token)
      .expect(200)
      .end(function(err, res) {
        if (err) done(err)
        res.body[0].should.have.property('url')
        res.body[0].should.not.have.property('name')
        res.body[0].should.not.have.property('favicon')
        bookmarkId = res.body[0].id
        done()
      })
  })
})

/**
 * Patch the bookmark.
 */
describe('PUT /user/bookmarks?extract[]=favicon', function() {
  it('should return 200', function(done) {
    request(app)
      .put('/user/bookmarks?extract[]=favicon')
      .set('Authorization', 'Bearer ' + token)
      .send({ id: bookmarkId, name: 'test001Bookmark', url: 'http://stackoverflow.com/' })
      .expect(200, done)
  })
})

/**
 * Get user and check updated bookmark.
 */
describe('GET /user/bookarks', function() {
  it('should return 200', function(done) {
    request(app)
      .get('/user/bookmarks')
      .set('Authorization', 'Bearer ' + token)
      .expect(200)
      .end(function(err, res) {
        if (err) done(err)
        res.body[0].name.should.equal('test001Bookmark')
        res.body[0].should.have.property('favicon')
        done()
      })
  })
})

/**
 * Delete the bookmark.
 */
describe('DELETE /user/bookmarks', function() {
  it('should return 200', function(done) {
    request(app)
      .delete('/user/bookmarks')
      .set('Authorization', 'Bearer ' + token)
      .send({ id: bookmarkId })
      .expect(200, done)
  })
})

/**
 * User delete.
 */
describe('DELETE /account', function() {
  it('should return 200', function(done) {
    request(app)
      .delete('/account')
      .set('Authorization', 'Bearer ' + token)
      .send({ password: 'fdsa' })
      .expect(200, done)
  })
})
