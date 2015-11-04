'use strict'

module.exports = {

  db: process.env.MONGODB || process.env.MONGOLAB_URI || 'mongodb://localhost:27017/test',

  sendgridApiKey: process.env.SENDGRID_PASSWORD || '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',

  tokenSecret: process.env.TOKEN_SECRET || 'JWT Token Secret',

  sessionSecret: process.env.SESSION_SECRET || 'Your Session Secret goes here',

  facebookSecret: process.env.FACEBOOK_SECRET || 'bf008664896bd3d91b67011c5a70c7f2',

  googleSecret: process.env.GOOGLE_SECRET || 'd6F8ku7Z9v2rBvWW5iCd0H7N'
}
