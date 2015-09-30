module.exports = function(app) {

  var userController = require('../controllers/user');
  var bookmarkController = require('../controllers/bookmark');
  var authController = require('../controllers/auth');
  var accountController = require('../controllers/account');

  var authMiddleware = require('../middlewares/auth');

  /**
   * Account routes.
   */
  app.get('/api/v1/me', authMiddleware.isAuthenticated, accountController.getMe);
  app.patch('/api/v1/me', authMiddleware.isAuthenticated, accountController.patchMe);
  app.delete('/api/v1/me', authMiddleware.isAuthenticated, accountController.deleteMe);

  /**
   * Auth routes.
   */
  app.post('/auth/login', authController.postLogin);
  app.post('/auth/signup', authController.postSignup);
  app.post('/auth/forgot', authController.postSignup);
  app.post('/auth/google', authController.postGoogle);
  app.post('/auth/facebook', authController.postFacebook);
  app.post('/auth/unlink', authMiddleware.isAuthenticated, authController.postUnlink);

  /**
   * User routes.
   */
  app.param('username', userController.user);
  app.get('/:username', userController.getUser);

  /**
   * Bookmark routes.
   */
  app.param('bookmark', bookmarkController.bookmark);
  app.get('/:username/:bookmark', bookmarkController.getDetail);
  app.post('/:username/add', authMiddleware.isAuthenticated, authMiddleware.isAuthorized, bookmarkController.postAdd);
  app.patch('/:username/:bookmark', authMiddleware.isAuthenticated, authMiddleware.isAuthorized, bookmarkController.patchBookmark);
  app.delete('/:username/:bookmark', authMiddleware.isAuthenticated, authMiddleware.isAuthorized, bookmarkController.delete);
};
