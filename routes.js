module.exports = function(app) {

  var userController = require('./controllers/user');
  var bookmarkController = require('./controllers/bookmark');
  var authController = require('./controllers/auth');
  var accountController = require('./controllers/account');

  var authMiddleware = require('./middlewares/auth');

  /**
   * Auth routes.
   */
  app.post('/auth/login', authController.postLogin);
  app.post('/auth/signup', authController.postSignup, authController.postVerify);
  app.post('/auth/reset', authController.postReset);
  app.post('/auth/reset/:token', authController.postResetConfirm);
  app.post('/auth/verify/', authController.postVerify);
  app.post('/auth/verify/:token', authController.postVerifyConfirm);
  app.post('/auth/facebook', authController.postFacebook);
  app.post('/auth/google', authController.postGoogle);
  app.post('/auth/unlink', authMiddleware.isAuthenticated, authController.postUnlink);

  /**
   * Account routes.
   */
  app.get('/account', authMiddleware.isAuthenticated, accountController.getAccount);
  app.patch('/account', authMiddleware.isAuthenticated, accountController.patchAccount);
  app.delete('/account', authMiddleware.isAuthenticated, accountController.deleteAccount);
  app.post('/account/password', authMiddleware.isAuthenticated, accountController.postPassword);
  app.post('/account/email', authMiddleware.isAuthenticated, accountController.postEmail);

  /**
   * User routes.
   */
  app.param('username', userController.username);
  app.get('/users/:username', userController.getUser);

  /**
   * Bookmark routes.
   */
  app.param('bookmark', bookmarkController.bookmark);
  app.post('/users/:username/add', authMiddleware.isAuthenticated, authMiddleware.isAuthorized, bookmarkController.postAdd);
  app.post('/users/:username/bulk', authMiddleware.isAuthenticated, authMiddleware.isAuthorized, bookmarkController.postBulk);
  app.get('/users/:username/:bookmark', bookmarkController.getDetail);
  app.patch('/users/:username/:bookmark', authMiddleware.isAuthenticated, authMiddleware.isAuthorized, bookmarkController.patchBookmark);
  app.delete('/users/:username/:bookmark', authMiddleware.isAuthenticated, authMiddleware.isAuthorized, bookmarkController.delete);
};
