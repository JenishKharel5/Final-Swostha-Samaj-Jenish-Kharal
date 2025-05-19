const express = require("express");
const router = express.Router();
const blogModel = require("../models/blog-model");
const isLoggedIn = require("../middlewares/isLoggedIn");
const checkRole = require("../middlewares/checkRole");
const fs = require('fs').promises;
const path = require('path');

// Middleware to ensure user is logged in and is staff
router.use(isLoggedIn);
router.use(checkRole("staff"));

// View pending blogs
router.get("/pending-blogs", async (req, res) => {
  try {
    const pendingBlogs = await blogModel.getPendingBlogs();
    res.render("staff/pending-blogs", {
      user: req.user,
      pendingBlogs,
      success: req.flash("success"),
      error: req.flash("error")
    });
  } catch (error) {
    console.error("Error fetching pending blogs:", error);
    req.flash("error", "Failed to load pending blogs");
    res.redirect("/staff/staff-dashboard");
  }
});

// Approve blog
router.post("/approve-blog/:id", async (req, res) => {
  try {
    await blogModel.updateBlogStatus(req.params.id, "approved");
    req.flash("success", "Blog post approved successfully");
    res.redirect(req.headers.referer || "/staff/staff-dashboard");
  } catch (error) {
    console.error("Error approving blog:", error);
    req.flash("error", "Failed to approve blog post");
    res.redirect(req.headers.referer || "/staff/staff-dashboard");
  }
});

// Reject blog
router.post("/reject-blog/:id", async (req, res) => {
  try {
    await blogModel.updateBlogStatus(req.params.id, "rejected");
    req.flash("success", "Blog post rejected");
    res.redirect(req.headers.referer || "/staff/staff-dashboard");
  } catch (error) {
    console.error("Error rejecting blog:", error);
    req.flash("error", "Failed to reject blog post");
    res.redirect(req.headers.referer || "/staff/staff-dashboard");
  }
});

// Delete blog
router.post("/delete-blog/:id", async (req, res) => {
  try {
    // Get blog details before deletion to handle image cleanup
    const blog = await blogModel.getBlogById(req.params.id);
    if (!blog) {
      req.flash("error", "Blog post not found");
      return res.redirect(req.headers.referer || "/staff/staff-dashboard");
    }

    // Delete the blog post
    await blogModel.deleteBlog(req.params.id);

    // Delete the associated image file if it exists
    if (blog.image) {
      const imagePath = path.join(__dirname, '..', 'public', blog.image);
      try {
        await fs.unlink(imagePath);
      } catch (err) {
        console.error("Error deleting blog image:", err);
        // Continue even if image deletion fails
      }
    }

    req.flash("success", "Blog post deleted successfully");
    res.redirect(req.headers.referer || "/staff/staff-dashboard");
  } catch (error) {
    console.error("Error deleting blog:", error);
    req.flash("error", "Failed to delete blog post");
    res.redirect(req.headers.referer || "/staff/staff-dashboard");
  }
});

module.exports = router; 