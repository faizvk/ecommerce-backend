import express from "express";
import mongoose from "mongoose";
import Cart from "../model/cart.model.js";
import Order from "../model/order.model.js";
import { verifyToken } from "../auth/auth.middleware.js";
import AutherizeRole from "../auth/role.middleware.js";

const router = express.Router();

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

      if (!shippingAddress) {
        return res
          .status(400)
          .json({ message: "Shipping address is required" });
      }

      const cart = await Cart.findOne({ userId });
      if (!cart) return res.status(404).json({ message: "No cart exists" });

      if (cart.products.length === 0) {
        return res.status(400).json({ message: "No products in cart" });
      }

      const order = await Order.create({
        userId,
        items: cart.products,
        totalAmount: cart.totalAmount,
        shippingAddress,
        status: "pending",
      });

      // Clear cart
      cart.products = [];
      cart.totalAmount = 0;
      await cart.save();

      res.status(201).json({
        message: "Order placed successfully",
        success: true,
        order,
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to place order", error: error.message });
    }
  }
);

/* -----------------------------------------------------
    USER: VIEW ALL MY ORDERS
------------------------------------------------------ */
router.get("/orders", verifyToken, AutherizeRole("user"), async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, orders });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch orders", error: error.message });
  }
});

/* -----------------------------------------------------
    USER: TRACK ORDER BY ID
------------------------------------------------------ */
router.get(
  "/order/track/:id",
  verifyToken,
  AutherizeRole("user"),
  async (req, res) => {
    try {
      const { id: orderId } = req.params;
      const userId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(orderId))
        return res.status(400).json({ message: "Invalid order ID" });

      const order = await Order.findOne({ _id: orderId, userId });

      if (!order) return res.status(404).json({ message: "No order exists" });

      res.status(200).json({
        success: true,
        order,
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to fetch order", error: error.message });
    }
  }
);

/* -----------------------------------------------------
    USER: CANCEL ORDER
------------------------------------------------------ */
router.put(
  "/order/cancel/:id",
  verifyToken,
  AutherizeRole("user"),
  async (req, res) => {
    try {
      const { id: orderId } = req.params;
      const userId = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(orderId))
        return res.status(400).json({ message: "Invalid order ID" });

      const order = await Order.findOne({ _id: orderId, userId });

      if (!order) {
        return res.status(404).json({ message: "No order exists" });
      }

      if (["shipped", "delivered"].includes(order.status)) {
        return res
          .status(400)
          .json({ message: "Order cannot be cancelled after shipping" });
      }

      if (order.status === "cancelled") {
        return res.status(400).json({ message: "Order already cancelled" });
      }

      order.status = "cancelled";
      await order.save();

      res.status(200).json({
        success: true,
        message: "Order cancelled successfully",
        order,
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to cancel order", error: error.message });
    }
  }
);

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
        .sort({ createdAt: -1 });

      res.status(200).json({ success: true, orders });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to fetch all orders", error: error.message });
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
      const { id } = req.params;
      const { status } = req.body;

      const validStatus = [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ];

      if (!validStatus.includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }

      const order = await Order.findById(id);
      if (!order) return res.status(404).json({ message: "Order not found" });

      order.status = status;
      await order.save();

      res.status(200).json({
        success: true,
        message: "Order status updated",
        order,
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to update order", error: error.message });
    }
  }
);

/* -----------------------------------------------------
    ADMIN: VIEW SINGLE ORDER DETAILS
------------------------------------------------------ */
router.get(
  "/admin/order/:id",
  verifyToken,
  AutherizeRole("admin"),
  async (req, res) => {
    try {
      const orderId = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(orderId))
        return res.status(400).json({ message: "Invalid order ID" });

      const order = await Order.findById(orderId).populate(
        "userId",
        "name email"
      );

      if (!order) return res.status(404).json({ message: "Order not found" });

      res.status(200).json({ success: true, order });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to fetch order", error: error.message });
    }
  }
);

router.get(
  "/orders/all",
  verifyToken,
  AutherizeRole("admin"),
  async (req, res) => {
    try {
      const orders = await Order.find().sort({ createdAt: -1 });
      res.json({ success: true, orders });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch all orders" });
    }
  }
);

export default router;
