# BookmarkPack Server

A NodeJS/Express/Mongoose REST server for saving bookmarks that can also be used as boilerplate for many REST services.  

Features:
- Authentication with JWT tokens
- Google and Facebook signup, login and account linking
- Email address verification
- Password reset
- Bookmarks CRUD
- Import bookmarks from Chrome/Firefox
- Import bookmarks from GitHub

Routes:

**POST /auth/login:** User login.   
* *@param {string} body.email - User's email.*  
* *@param {string} body.password - User's password.*  
* *@return {token} - JWT token.*  

**POST /auth/signup:** User local signup.  
* *@param {string} body.email - User's email.*  
* *@param {string} body.password - User's password.*  
* *@param {string} body.username - User's username (optional).*  
* *@return {token} - JWT token.*  

**POST /auth/reset:** Create a random token, then the send user an email with a reset link.  
* *@param {string} body.email - User's email.*  

**POST /auth/reset/:token:** Process the reset password request.  
* *@param {string} body.password - User's new password.*  

**POST /auth/verify:** Create a random token, then the send user an email with a verification link.  
* *@param {string} body.email - User's email.*  
 
**POST /auth/verify/:token:** Process the verification request.  

**POST /auth/facebook:** Facebook login/signup.  
* *@param {string} body.code - The login code from Facebook.*  
* *@param {string} body.clientId - The clientId of the application.*  
* *@param {string} body.redirectUri - The redirect URL of the caller.*  
* *@return {token} - JWT token.*  

**POST /auth/google:** Google login/signup.  
* *@param {string} body.code - The login code from Google.*  
* *@param {string} body.clientId - The clientId of the application.*  
* *@param {string} body.redirectUri - The redirect URL of the caller.*  
* *@return {token} - JWT token.*  

**POST /auth/unlink:** Unlink the user account from facebook or google.  
* *@param {string} body.provider - The provider to unlink (can be 'facebook' or 'google').*  

**GET /account:** Return the logged in user.  
* *@return {user} - The logged in user.*    

**PATCH /account:** Change one or more user setting.  
* *@param {string} body.username - New username (optional).*  
* *@param {string} body.picture - New user picture url (optional).*  

**DELETE /account:** Delete user account.  
* *@param {string} body.password - Current password.*  
 
**POST /account/password:** Change user password.  
* *@param {string} body.oldPassword - Current password.*  
* *@param {string} body.newPassword - New password.*  
 
**POST /account/email:** Change user password.
* *@param {string} body.email - New user email (optional).*  
* *@param {string} body.password - Current password.*  
 
**GET /user:** Get the logged in user.  
* *@return {user} - The logged in user.*  
 
**GET /users/:username:** Get a specific user.  
* *@return {user} - The specific requested user.*  
 
**GET /user/bookmarks:** Get the bookmarks of the current user.  
* *@return {[bookmark]} body - An array with the bookmarks of the current user.*  
 
**POST /user/bookmarks:** Add new bookmarks to the current user.  
* *@param {bookmark}/{[bookmark]} body - A single bookmark or an array of bookmarks.*  
* *@param {bookmark}/{[bookmark]} - The single updated bookmark or the array of updated bookmarks.*  
 
**PUT /user/bookmarks:** Updates some bookmark info.  
* *@param {bookmark/[bookmark]} body - The properties of the bookmarks that must be updated. Every submitted bookmark must have at least the id.*  
* *@return {bookmark} - The updated bookmark.*  
 
**DELETE /user/bookmarks:** Delete one or more bookmarks.  
* *@param {bookmark/[bookmarks]} body - The id or an array of id of the bookmarks to delete.*  
 
**POST /user/bookmarks/import:** Adds the exported bookmarks to the current user.  
* *@param {file} - Bookmarks exported in HTML format.*  
 
**POST /user/bookmarks/github:** Adds the GitHub starred repositories from the specified username.  
* *@param {string} body.username - The GitHub username of the owner of the starred repositories to import.*  
