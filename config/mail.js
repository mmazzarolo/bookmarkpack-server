exports.resetMail = function(email, token) {
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

exports.resetConfirmMail = function(email) {
  return {
    to: email,
    from: 'bookmark@pack.com',
    subject: 'Your BookmarkPack password has been changed',
    text:
      'Hello,\n\n' +
      'This is a confirmation that the password for your account ' + email + ' has just been changed.\n'
  }
};

exports.verifyMail = function(email, token) {
  return {
    to: email,
    from: 'bookmark@pack.com',
    subject: 'Verify your account',
    text:
      'You are receiving this email because you (or someone else) have registered a new account on BookmarkPack.\n\n' +
      'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
      'http://localhost:8000/#/verify/' + token + '\n\n' +
      'If you did not request this, please ignore this email and the account will be deleted.\n'
  }
};
