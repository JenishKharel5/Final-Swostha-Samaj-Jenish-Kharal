const express = require("express");
const router = express.Router();
const ownerModel = require("../models/owner-model");
const userModel = require("../models/user-model");
const appointmentModel = require("../models/appointment-model");
const checkRole = require("../middlewares/checkRole");
const productModel = require("../models/product-model");
const upload = require("../config/multer-config");

router.get("/create", (req, res) => {
  res.send("Hey its working!!");
});

router.post("/create", async (req, res) => {
  let owners = await ownerModel.find();
  if (owners.length > 0) {
    return res
      .status(503)
      .send("You don't have permission to create new owner.");
  }
  let { fullname, email, password } = req.body;

  const createdOwner = new ownerModel({
    fullname,
    email,
    password,
  });

  await createdOwner.save();
  return res.status(201).send(createdOwner);
});

router.get("/admin", (req, res) => {
  let success = req.flash("success");
  res.render("createMedicine", { user: req.user, success: success });
});

//post medicine
router.post("/createMedicine", upload.single("image"), async (req, res) => {
  let { name, price, description, discount } = req.body;
  const imagePath = req.file ? 'uploads/' + req.file.filename : null;
  await productModel.createProduct({
    image: imagePath,
    name,
    description,
    price,
    discount,
  });

  req.flash("success", "Medicine Added Successfully!");
  res.redirect("/owners/admin");
});

//get all medicines
router.get("/medicines", async (req, res) => {
  try {
    const success = req.flash("success");
    const [products] = await productModel.getAllProducts();
    res.render("all-medicines", { user: req.user, success, products });
  } catch (error) {
    console.error("Error fetching medicines:", error);
    res.status(500).send("Error loading page.");
  }
});

// Render Edit Medicine Page
router.get("/edit/:productId", async (req, res) => {
  try {
    const productId = req.params.productId;

    // Fetch the medicine details
    const product = await productModel.getProductById(productId);

    if (!product) {
      return res.status(404).send("Medicine not found.");
    }

    // Render the edit medicine page
    res.render("edit-medicine", { user: req.user, product, success: "" });
  } catch (error) {
    console.error("Error fetching medicine details:", error);
    res.status(500).send("Error loading page.");
  }
});

// Handle Edit Medicine Form Submission
router.post("/edit/:productId", upload.single("image"), async (req, res) => {
  try {
    let { name, price, description, discount } = req.body;
    console.log(req.file);
    console.log(req.params.productId);
    const imagePath =
      req.file
        ? req.file.path
        : (await productModel.getProductById(req.params.productId)).image;

    const productId = req.params.productId;

    // Update the medicine details
    await productModel.updateProduct(productId, {
      image: imagePath,
      name,
      description,
      price,
      discount,
    });

    // Set the success flash message and redirect to the edit page
    req.flash("success", "Medicine updated successfully!");
    res.redirect("/");
  } catch (error) {
    console.error("Error updating medicine:", error);
    req.flash("error", "Error updating medicine.");
    res.redirect("/owners/edit/" + req.params.productId);
  }
});

router.get("/delete/:productId", async (req, res) => {
  try {
    const productId = req.params.productId;
    await productModel.deleteProduct(productId);
    req.flash("success", "Medicine deleted successfully!");
    res.redirect("/");
  } catch (error) {
    console.error("Error deleting medicine:", error);
    req.flash("error", "Error deleting medicine.");
    res.redirect("/");
  }
});

module.exports = router;
