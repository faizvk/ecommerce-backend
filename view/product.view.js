import Product from "../model/prodect.model.js";
import express from "express";

const router = express.Router();

router.post("/createProduct", async (req, res) => {
  const product = req.body;
  if (!product) {
    return res.status(400).send("product not created.");
  }

  const createdProduct = await Product.create(product);

  res.status(201).json({
    message: "product created",
    success: true,
    createdProduct,
  });
});

router.get("/fetchAll", async (req, res) => {
  const products = await Product.find();
  if (products.lenghth === 0) {
    return res.status(404).send("No products.");
  }

  res.status(200).json({
    products,
  });
});

router.get("/fetch/:id", async (req, res) => {
  const { id } = req.params;
  const product = await Product.findById(id);
  if (!product) {
    return res.status(404).send("product not found");
  }
  res.status(200).json({
    product,
  });
});

router.put("/updateProduct/:id", async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  const product = await Product.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  if (!product) {
    return res.status(404).send("product dont exist.");
  }

  res.status(200).json({
    message: "product updated",
    product,
  });
});

router.delete("/deleteProduct/:id", async (req, res) => {
  const { id } = req.params;
  const deletedProduct = await Product.findByIdAndDelete(id);

  if (!deletedProduct) {
    return res.status(404).json({ message: "Product not found" });
  }

  return res.status(200).json({
    message: "Product deleted successfully",
    deletedProduct,
  });
});

router.get("/searchProduct", async (req, res) => {
  const { name } = req.query;

  const products = await Product.find({
    name: { $regex: name, $options: "i" },
  });

  if (products.length === 0) {
    return res.status(404).send("No result.");
  }
  res.status(200).json({
    products,
  });
});

export default router;
