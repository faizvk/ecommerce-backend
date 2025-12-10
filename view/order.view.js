import express from "express";
import mongoose from "mongoose";
import Cart from "../model/cart.model.js";
import Order from "../model/order.model.js";
import { verifyToken } from "../auth/auth.middleware.js";
import AutherizeRole from "../auth/role.middleware.js";

const router = express.Router();

const isValid = (id) => mongoose.Types.ObjectId.isValid(id);

const validStatus = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

/* -----------------------------------------------------
    USER: PLACE ORDER
------------------------------------------------------ */
router.post(
  "/order/place",
  verifyToken,
  AutherizeRole("user"),
  async (req, res) => {
    try {
      const { shippingAddress } = req.body;
      const userId = req.user.id;

      if (!shippingAddress)
        return res
          .status(400)
          .json({ message: "Shipping address is required" });

      const cart = await Cart.findOne({ userId });
      if (!cart) return res.status(404).json({ message: "No cart exists" });
      if (cart.products.length === 0)
        return res.status(400).json({ message: "No products in cart" });

      const order = await Order.create({
        userId,
        items: cart.products,
        totalAmount: cart.totalAmount,
        shippingAddress,
        status: "pending",
      });

      cart.products = [];
      cart.totalAmount = 0;
      await cart.save();

      res.status(201).json({
        success: true,
        message: "Order placed successfully",
        order,
      });
    } catch (error) {
      res.status(500).json({
        message: "Failed to place order",
        error: error.message,
      });
    }
  }
);

/* -----------------------------------------------------
    USER: VIEW MY ORDERS
------------------------------------------------------ */
router.get("/orders", verifyToken, AutherizeRole("user"), async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id })
      .populate("items.productId")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, orders });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
});

router.get("/order/:id", verifyToken, async (req, res) => {
  try {
    const orderId = req.params.id;

    if (!isValid(orderId))
      return res.status(400).json({ message: "Invalid order ID" });

    let order;

    if (req.user.role === "admin") {
      // Admin can view ANY order
      order = await Order.findById(orderId)
        .populate("userId", "name email")
        .populate("items.productId");
    } else {
      // User can ONLY view own order
      order = await Order.findOne({
        _id: orderId,
        userId: req.user.id,
      }).populate("items.productId");
    }

    if (!order) return res.status(404).json({ message: "Order not found" });

    res.status(200).json({ success: true, order });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch order",
      error: error.message,
    });
  }
});

router.put("/order/cancel/:id", verifyToken, async (req, res) => {
  try {
    const orderId = req.params.id;

    if (!isValid(orderId))
      return res.status(400).json({ message: "Invalid order ID" });

    let order;

    if (req.user.role === "admin") {
      // Admin: can cancel any order
      order = await Order.findById(orderId);
    } else {
      // User: only own orders
      order = await Order.findOne({
        _id: orderId,
        userId: req.user.id,
      });
    }

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (["shipped", "delivered"].includes(order.status))
      return res.status(400).json({
        message: "Order cannot be cancelled after shipping",
      });

    if (order.status === "cancelled")
      return res.status(400).json({ message: "Order already cancelled" });

    order.status = "cancelled";
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to cancel order",
      error: error.message,
    });
  }
});

/* -----------------------------------------------------
    ADMIN: VIEW ALL ORDERS
------------------------------------------------------ */
router.get(
  "/admin/orders",
  verifyToken,
  AutherizeRole("admin"),
  async (req, res) => {
    try {
      const orders = await Order.find()
        .populate("userId", "name email")
        .populate("items.productId")
        .sort({ createdAt: -1 });

      res.status(200).json({ success: true, orders });
    } catch (error) {
      res.status(500).json({
        message: "Failed to fetch all orders",
        error: error.message,
      });
    }
  }
);

/* -----------------------------------------------------
    ADMIN: UPDATE ORDER STATUS
------------------------------------------------------ */
router.put(
  "/admin/order/status/:id",
  verifyToken,
  AutherizeRole("admin"),
  async (req, res) => {
    try {
      const orderId = req.params.id;
      const { status } = req.body;

      if (!isValid(orderId))
        return res.status(400).json({ message: "Invalid order ID" });

      if (!validStatus.includes(status))
        return res.status(400).json({ message: "Invalid status" });

      const order = await Order.findById(orderId)
        .populate("userId", "name email")
        .populate("items.productId");

      if (!order) return res.status(404).json({ message: "Order not found" });

      order.status = status;
      await order.save();

      res.status(200).json({
        success: true,
        message: "Order status updated",
        order,
      });
    } catch (error) {
      res.status(500).json({
        message: "Failed to update order",
        error: error.message,
      });
    }
  }
);

export default router;
