import express from "express";
import mongoose from "mongoose";
import userRoutes from "./view/user.view.js";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());

const uri = process.env.MONGOOSE_URI;

mongoose
  .connect(uri)
  .then(() => console.log("connected to database..."))
  .catch((err) => console.log("coudnt connect", err));

app.use(userRoutes);

app.listen(3000, () => {
  console.log("server listening on 3000....");
});
