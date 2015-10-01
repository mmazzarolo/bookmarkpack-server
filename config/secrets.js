module.exports = {

  db: process.env.MONGODB || process.env.MONGOLAB_URI || 'mongodb://localhost:27017/test',

  tokenSecret: process.env.TOKEN_SECRET || 'JWT Token Secret',

  sessionSecret: process.env.SESSION_SECRET || 'Your Session Secret goes here',

  facebookSecret: process.env.FACEBOOK_SECRET || '41860e58c256a3d7ad8267d3c1939a4a',

  githubSecret: process.env.GITHUB_SECRET || '815aa4606f476444691c5f1c16b9c70da6714dc6',

  googleSecret: process.env.GOOGLE_SECRET || 'JdZsIaWhUFIchmC1a_IZzOHb'

};
