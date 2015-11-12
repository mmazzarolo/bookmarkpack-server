'use strict'

module.exports = {

  db: process.env.MONGODB,

  sendgridApiKey: process.env.SENDGRID_PASSWORD,

  tokenSecret: process.env.TOKEN_SECRET,

  sessionSecret: process.env.SESSION_SECRET,

  facebookSecret: process.env.FACEBOOK_SECRET,

  googleSecret: process.env.GOOGLE_SECRET
}
