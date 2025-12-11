// routes/payment.routes.js
import express from "express";
import Razorpay from "razorpay";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * POST /api/payment/create-order
 * Body: { amount: number }  // in rupees
 */
router.post("/payment/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const options = {
      amount: amount * 100, // amount in paise
      currency: "INR",
      receipt: "rcpt_" + Date.now(),
    };

    const order = await razorpayInstance.orders.create(options);

    return res.status(201).json({
      success: true,
      order,
      key: process.env.RAZORPAY_KEY_ID, // send to frontend
    });
  } catch (err) {
    console.error("Razorpay order error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to create payment order",
    });
  }
});

export default router;
