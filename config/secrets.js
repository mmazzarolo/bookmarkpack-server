module.exports = {

  db: process.env.MONGODB || process.env.MONGOLAB_URI || 'mongodb://localhost:27017/test',

  tokenSecret: process.env.TOKEN_SECRET || 'JWT Token Secret',

  sessionSecret: process.env.SESSION_SECRET || 'Your Session Secret goes here',

  facebookSecret: process.env.FACEBOOK_SECRET || 'bf008664896bd3d91b67011c5a70c7f2',

  githubSecret: process.env.GITHUB_SECRET || '815aa4606f476444691c5f1c16b9c70da6714dc6',

  googleSecret: process.env.GOOGLE_SECRET || 'd6F8ku7Z9v2rBvWW5iCd0H7N'

};
