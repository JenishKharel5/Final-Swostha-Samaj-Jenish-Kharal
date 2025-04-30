const checkRole = (roles) => {
  return (req, res, next) => {
    // Ensure the user is authenticated
    if (!req.user) {
      return res.status(401).send("Unauthorized: Please log in.");
    }

    // Check if the user's role is allowed
    if (roles.includes(req.user.role)) {
      next(); // User has the required role, proceed to the next middleware/route
    } else {
      res
        .status(403)
        .send("Forbidden: You do not have permission to access this resource.");
    }
  };
};

module.exports = checkRole;
