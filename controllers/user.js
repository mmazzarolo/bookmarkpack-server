'use strict'

var User = require('../models/User')

/**
 * app.param {username}
 */
exports.username = function(req, res, next, username) {
  console.log('-> userController.username')
  console.log('Requested username: ' + username)
  User.findOne({ username: username }, function(err, user) {
    if (err) return next(err)
    if (!user) return res.status(404).send({ message: 'Unknown user.' })
    req.user = user
    next()
  })
}

/**
 * GET user
 *
 * Get the logged in user.
 *
 * @return {user} - The logged in user.
 */
exports.getMe = function(req, res) {
  console.log('-> userController.getMe')
  return res.status(200).send(req.user)
}

/**
 * GET users/:username
 *
 * Get a specific user.
 *
 * @return {user} - The specific requested user.
 */
exports.getUser = function(req, res) {
  console.log('-> userController.getUser')
  return res.status(200).send(req.user)
}
