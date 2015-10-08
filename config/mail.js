exports.forgotMail = function(email, token) {
  return {
    to: email,
    from: 'bookmark@pack.com',
    subject: 'Reset your password on BookmarkPack',
    text:
      'You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n' +
      'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
      'http://localhost:8000/#/reset/' + token + '\n\n' +
      'If you did not request this, please ignore this email and your password will remain unchanged.\n'
  }
};

exports.resetMail = function(email) {
  return {
    to: email,
    from: 'bookmark@pack.com',
    subject: 'Your BookmarkPack password has been changed',
    text:
      'Hello,\n\n' +
      'This is a confirmation that the password for your account ' + email + ' has just been changed.\n'
  }
};
