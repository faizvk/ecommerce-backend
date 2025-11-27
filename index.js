import express from "express";
import mongoose from "mongoose";
import userRoutes from "./view/user.view.js";
import productRoutes from "./view/product.view.js";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too Many Requests, Please Try Again Later",
});

app.use(limiter);

const uri = process.env.MONGOOSE_URI;

mongoose
  .connect(uri)
  .then(() => console.log("connected to database..."))
  .catch((err) => console.log("coudnt connect", err));

app.use(userRoutes);
app.use(productRoutes);

app.listen(3000, () => {
  console.log("server listening on 3000....");
});
