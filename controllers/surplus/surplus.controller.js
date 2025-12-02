import Surplus from "../../models/surplus.model.js";
import User from "../../models/user.model.js";
import { uploadToCloudinary } from "../../middlewares/uploadCloudinary.js";

// create surplus post
export const createSurplus = async (req, res) => {
  try {
    const { title, description, quantity, deadline } = req.body;

    if (!description || !quantity || !deadline) {
      return res.status(400).json({ message: "description, quantity and deadline required" });
    }

    let imageUrl = null;

    if (req.file && req.file.buffer) {
      const uploaded = await uploadToCloudinary(req.file.buffer, "surplus");
      imageUrl = uploaded.secure_url;
    }

    const surplus = await Surplus.create({
      title,
      description,
      quantity,
      deadline,
      imageUrl,
      postedBy: req.user.id,
      status: "available"
    });

    res.status(201).json({
      message: "Surplus posted",
      surplus
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAvailableSurplus = async (req, res) => {
  try {
    const now = new Date();

    // auto-expire old posts
    await Surplus.updateMany(
      { deadline: { $lt: now }, status: "available" },
      { status: "expired" }
    );

    const surplus = await Surplus.find({ status: "available" })
      .sort({ createdAt: -1 });

    res.status(200).json({ surplus });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const claimSurplus = async (req, res) => {
  try {
    const { surplusId } = req.params;

    const surplus = await Surplus.findById(surplusId);
    if (!surplus) return res.status(404).json({ message: "Not found" });

    // Check if already taken
    if (surplus.status !== "available") {
      return res.status(400).json({ message: "Already claimed or unavailable" });
    }

    // Check deadline
    const now = new Date();
    if (surplus.deadline < now) {
      surplus.status = "expired";
      await surplus.save();
      return res.status(400).json({ message: "Food already expired" });
    }

    // Claim
    surplus.claimedBy = req.user.id;
    surplus.status = "claimed";
    await surplus.save();

    res.status(200).json({ message: "Claimed successfully", surplus });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const updateSurplusStatus = async (req, res) => {
  try {
    const { surplusId } = req.params;
    const { status } = req.body;

    if (!["distributed", "expired"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const surplus = await Surplus.findById(surplusId);
    if (!surplus) return res.status(404).json({ message: "Not found" });

    surplus.status = status;
    await surplus.save();

    res.status(200).json({ message: "Status updated", surplus });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAllSurplus = async (req, res) => {
  try {
    const userId = req.user.id; // logged-in Mess Manager ID

    const surplus = await Surplus.find({ postedBy: userId })
      .populate("claimedBy", "name email phone")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Surplus items fetched",
      surplus
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAllNGOs = async (req, res) => {
  try {
    // Only messManager can access this
    if (req.user.role !== "messManager") {
      return res.status(403).json({ message: "Access denied" });
    }

    const ngos = await User.find({ role: "ngo" })
      .select("name email phone address createdAt");

    return res.status(200).json({
      message: "NGOs fetched successfully",
      ngos
    });

  } catch (err) {
    console.error("GET NGO ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
};

export const deleteNGO = async (req, res) => {
  try {
    // 1. Validate role
    if (req.user.role !== "messManager") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { ngoId } = req.params;

    // 2. Fetch user
    const ngo = await User.findById(ngoId);

    if (!ngo) {
      return res.status(404).json({ message: "NGO not found" });
    }

    // 3. Ensure the user is actually an NGO
    if (ngo.role !== "ngo") {
      return res.status(400).json({ message: "User is not an NGO" });
    }

    // 4. Delete NGO
    await User.findByIdAndDelete(ngoId);

    return res.status(200).json({ message: "NGO deleted successfully" });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
