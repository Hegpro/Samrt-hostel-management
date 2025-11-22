import cron from "node-cron";
import Surplus from "../models/surplus.model.js";

console.log("⏳ Cron running at:", new Date().toLocaleTimeString());


// This cron job runs every 1 minute
cron.schedule("* * * * *", async () => {
  try {
    const now = new Date();

    const result = await Surplus.updateMany(
      { deadline: { $lt: now }, status: "available" }, // deadline passed & still available
      { status: "expired" } // mark expired
    );

    if (result.modifiedCount > 0) {
      console.log(`⏱️ Cron: Expired ${result.modifiedCount} surplus food items.`);
    }

  } catch (err) {
    console.error("Cron Job Error:", err.message);
  }
});
