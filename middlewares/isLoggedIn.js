const isLoggedIn = (req, res, next) => {
  if (req.user) {
    next();
  } else {
    res.redirect('/login');
  }
};

module.exports = isLoggedIn;