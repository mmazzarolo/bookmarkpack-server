var chai = require('chai');
var should = chai.should();
var User = require('../models/User');

describe('User Model', function() {
  it('should not create a user with reserved username', function(done) {
    var user = new User({
      username: 'test',
      email: 'test@gmail.com',
      password: 'test'
    });
    user.save(function(err) {
      if (err) err.name.should.equal('ValidationError');
      done();
    });
  });

  it('should create a new user', function(done) {
    var user = new User({
      username: 'testing',
      email: 'test@gmail.com',
      password: 'test'
    });
    user.save(function(err) {
      if (err) return done(err);
      done();
    })
  });

  it('should not create a user with the unique email', function(done) {
    var user = new User({
      email: 'test@gmail.com',
      password: 'test'
    });
    user.save(function(err) {
      if (err) err.name.should.equal('ValidationError');
      done();
    });
  });

  it('should find user by email', function(done) {
    User.findOne({ email: 'test@gmail.com' }, function(err, user) {
      if (err) return done(err);
      user.email.should.equal('test@gmail.com');
      done();
    });
  });

  it('should delete a user', function(done) {
    User.remove({ email: 'test@gmail.com' }, function(err) {
      if (err) return done(err);
      done();
    });
  });
});
