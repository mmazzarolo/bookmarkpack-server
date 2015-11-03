'use strict'

module.exports = function(app) {

  var userController = require('./controllers/user')
  var bookmarkController = require('./controllers/bookmark')
  var authController = require('./controllers/auth')
  var accountController = require('./controllers/account')

  var authMiddleware = require('./middlewares/auth')
  var formatMiddleware = require('./middlewares/format')
  var validMiddleware = require('./middlewares/validation')

  /**
   * Auth routes.
   */
  app.post('/auth/login', authController.login)
  app.post('/auth/signup', authController.signup, authController.verify)
  app.post('/auth/reset', authController.reset)
  app.post('/auth/reset/:token', authController.resetConfirm)
  app.post('/auth/verify/', authController.verify)
  app.post('/auth/verify/:token', authController.verifyConfirm)
  app.post('/auth/facebook', authController.facebook)
  app.post('/auth/google', authController.google)
  app.post('/auth/unlink', authMiddleware.isAuthenticated, authController.unlink)

  /**
   * Account routes.
   */
  app.get('/account', authMiddleware.isAuthenticated, accountController.getAccount)
  app.patch('/account', authMiddleware.isAuthenticated, accountController.editAccount)
  app.delete('/account', authMiddleware.isAuthenticated, accountController.deleteAccount)
  app.post('/account/password', authMiddleware.isAuthenticated, accountController.editPassword)
  app.post('/account/email', authMiddleware.isAuthenticated, accountController.editEmail)

  /**
   * User routes.
   */
  app.param('username', userController.username)
  app.get('/user', authMiddleware.isAuthenticated, authMiddleware.getAuthenticatedUser, userController.getMe)
  app.get('/users/:username', userController.getUser)

  /**
   * Bookmark routes.
   */
  app.get('/user/bookmarks',
    authMiddleware.isAuthenticated,
    authMiddleware.getAuthenticatedUser,
    bookmarkController.getMyBookmarks)

  app.post('/user/bookmarks',
    authMiddleware.isAuthenticated,
    authMiddleware.getAuthenticatedUser,
    formatMiddleware.formatBookmarks,
    bookmarkController.addBookmarks)

  app.put('/user/bookmarks',
    authMiddleware.isAuthenticated,
    authMiddleware.getAuthenticatedUser,
    formatMiddleware.formatBookmarks,
    bookmarkController.editBookmarks)

  app.delete('/user/bookmarks',
    authMiddleware.isAuthenticated,
    authMiddleware.getAuthenticatedUser,
    formatMiddleware.formatBookmarks,
    bookmarkController.deleteBookmarks)

  app.post('/user/bookmarks/import',
    authMiddleware.isAuthenticated,
    authMiddleware.getAuthenticatedUser,
    bookmarkController.import)

  app.post('/user/bookmarks/github',
    authMiddleware.isAuthenticated,
    authMiddleware.getAuthenticatedUser,
    bookmarkController.github)
 }
