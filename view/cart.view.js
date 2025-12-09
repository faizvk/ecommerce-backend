import express from "express";
import mongoose from "mongoose";
import Cart from "../model/cart.model.js";
import Product from "../model/product.model.js";
import { verifyToken } from "../auth/auth.middleware.js";
import AutherizeRole from "../auth/role.middleware.js";

const router = express.Router();

/* -----------------------------------------
   ADD TO CART (Users Only)
------------------------------------------ */
router.post(
  "/cart/add",
  verifyToken,
  AutherizeRole("user"),
  async (req, res) => {
    try {
      const { productId, quantity = 1 } = req.body;
      const userId = req.user.id;

      if (!productId) {
        return res.status(400).json({
          message: "Product ID is required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({
          message: "Invalid product ID",
        });
      }

      if (quantity < 1) {
        return res.status(400).json({
          message: "Quantity must be at least 1",
        });
      }

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          message: "Product not found",
        });
      }

      let cart = await Cart.findOne({ userId });

      if (!cart) {
        cart = new Cart({
          userId,
          products: [],
          totalAmount: 0,
        });
      }

      const productIndex = cart.products.findIndex(
        (item) => item.productId.toString() === productId
      );

      if (productIndex > -1) {
        cart.products[productIndex].quantity += quantity;
      } else {
        cart.products.push({
          productId,
          price: product.salePrice,
          quantity,
        });
      }

      cart.totalAmount = cart.products.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      await cart.save();

      res.status(201).json({
        message: "Product added to cart",
        success: true,
        cart,
      });
    } catch (error) {
      res.status(500).json({
        message: "Failed to add product to cart",
        error: error.message,
      });
    }
  }
);

/* -----------------------------------------
   GET CART (Users Only)
------------------------------------------ */
router.get("/cart", verifyToken, AutherizeRole("user"), async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({
        message: "No cart exists",
      });
    }

    res.status(200).json({
      message: "Cart fetched",
      success: true,
      cart,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch cart",
      error: error.message,
    });
  }
});

/* -----------------------------------------
   REMOVE ITEM (Users Only)
------------------------------------------ */
router.delete(
  "/cart/remove/:id",
  verifyToken,
  AutherizeRole("user"),
  async (req, res) => {
    try {
      const productId = req.params.id;
      const userId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({
          message: "Invalid product ID",
        });
      }

      const cart = await Cart.findOne({ userId });

      if (!cart) {
        return res.status(404).json({
          message: "No cart exists",
        });
      }

      if (cart.products.length === 0) {
        return res.status(400).json({
          message: "No products to remove",
        });
      }

      const productIndex = cart.products.findIndex(
        (item) => item.productId.toString() === productId
      );

      if (productIndex === -1) {
        return res.status(404).json({
          message: "Product not found in cart",
        });
      }

      if (cart.products[productIndex].quantity === 1) {
        cart.products.splice(productIndex, 1);
      } else {
        cart.products[productIndex].quantity -= 1;
      }

      cart.totalAmount = cart.products.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      await cart.save();

      res.status(200).json({
        message: "Product removed",
        success: true,
        cart,
      });
    } catch (error) {
      res.status(500).json({
        message: "Failed to remove product",
        error: error.message,
      });
    }
  }
);

export default router;
