var request = require('supertest')
var chai = require('chai')
var should = chai.should()

var app = require('../../server.js')
var User = require('../../models/User')

var alpha = {
  username: 'alpha',
  email: 'alpha@gmail.com',
  password: 'asdf'
}
var token

var bookmarks = [
  { url: 'https://www.npmjs.com/' },
  { url: 'http://stackoverflow.com/' },
  { url: 'http://www.ebay.it/' },
  { url: 'http://www.amazon.it/' },
  { url: 'https://www.reddit.com/' },
  { url: 'https://www.youtube.com/' },
  { url: 'https://www.dropbox.com' },
  { url: 'https://www.google.it' },
  { url: 'https://github.com/' },
  { url: 'http://git-scm.com/' },
]


/**
 * User signup.
 */
describe('POST /auth/signup', function() {
  it('should return 200', function(done) {
    request(app)
      .post('/auth/signup')
      .send(alpha)
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
      .send({ email: 'alpha@gmail.com', password: 'asdf' })
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
 * User validation.
 */
describe('POST /auth/verify', function() {
  it('should return 200', function(done) {
    request(app)
      .post('/auth/verify')
      .send({ email: 'alpha@gmail.com' })
      .expect(200, done)
  })
})

describe('User validation', function() {
  it('should validate user by email', function(done) {
    User.findOne({ email: 'alpha@gmail.com' }, function(err, user) {
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
 * Create a new bookmark.
 */
describe('POST /user/bookmarks', function() {
  it('should return 200', function(done) {
    request(app)
      .post('/user/bookmarks?extract=favicon')
      .set('Authorization', 'Bearer ' + token)
      .send(bookmarks)
      .expect(200, done)
  })
})

/**
 * User delete.
 */
// describe('DELETE /account', function() {
//   it('should return 200', function(done) {
//     request(app)
//       .delete('/account')
//       .set('Authorization', 'Bearer ' + token)
//       .send({ password: 'asdf' })
//       .expect(200, done);
//   });
// });
