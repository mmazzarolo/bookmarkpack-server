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
  app.post('/auth/login', authController.postLogin)
  app.post('/auth/signup', authController.postSignup, authController.postVerify)
  app.post('/auth/reset', authController.postReset)
  app.post('/auth/reset/:token', authController.postResetConfirm)
  app.post('/auth/verify/', authController.postVerify)
  app.post('/auth/verify/:token', authController.postVerifyConfirm)
  app.post('/auth/facebook', authController.postFacebook)
  app.post('/auth/google', authController.postGoogle)
  app.post('/auth/unlink', authMiddleware.isAuthenticated, authController.postUnlink)

  /**
   * Account routes.
   */
  app.get('/account', authMiddleware.isAuthenticated, accountController.getAccount)
  app.patch('/account', authMiddleware.isAuthenticated, accountController.patchAccount)
  app.delete('/account', authMiddleware.isAuthenticated, accountController.deleteAccount)
  app.post('/account/password', authMiddleware.isAuthenticated, accountController.postPassword)
  app.post('/account/email', authMiddleware.isAuthenticated, accountController.postEmail)

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
    validMiddleware.validateBookmarksJson,
    validMiddleware.postMyBookmarks,
    bookmarkController.postMyBookmarks)

  app.patch('/user/bookmarks',
    authMiddleware.isAuthenticated,
    authMiddleware.getAuthenticatedUser,
    bookmarkController.patchMyBookmark)

  app.delete('/user/bookmarks',
    authMiddleware.isAuthenticated,
    authMiddleware.getAuthenticatedUser,
    validMiddleware.validateBookmarksJson,
    validMiddleware.deleteMyBookmarks,
    bookmarkController.deleteMyBookmarks)

  app.post('/user/bookmarks/import',
    authMiddleware.isAuthenticated,
    authMiddleware.getAuthenticatedUser,
    bookmarkController.postImport)

  app.post('/user/bookmarks/github',
    authMiddleware.isAuthenticated,
    authMiddleware.getAuthenticatedUser,
    bookmarkController.postGithub)
  // app.get('/users/:username/bookmarks/:bookmark', bookmarkController.getBookmark);
 }
