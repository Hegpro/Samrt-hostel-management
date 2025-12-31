import Surplus from "../../models/surplus.model.js";
import User from "../../models/user.model.js";
import { uploadToCloudinary } from "../../middlewares/uploadCloudinary.js";
import { sendEmail } from "../../utils/email.js";


// create surplus post
// export const createSurplus = async (req, res) => {
//   try {
//     const { title, description, quantity, deadline } = req.body;

//     if (!description || !quantity || !deadline) {
//       return res.status(400).json({ message: "description, quantity and deadline required" });
//     }

//     let imageUrl = null;

//     if (req.file && req.file.buffer) {
//       const uploaded = await uploadToCloudinary(req.file.buffer, "surplus");
//       imageUrl = uploaded.secure_url;
//     }

//     const surplus = await Surplus.create({
//       title,
//       description,
//       quantity,
//       deadline,
//       imageUrl,
//       postedBy: req.user.id,
//       status: "available"
//     });

//     res.status(201).json({
//       message: "Surplus posted",
//       surplus
//     });

//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// export const createSurplus = async (req, res) => {
//   try {
//     const { title, description, quantity, deadline } = req.body;

//     if (!description || !quantity || !deadline) {
//       return res.status(400).json({
//         message: "description, quantity and deadline are required",
//       });
//     }

//     // Deadline validation
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     const expiryDate = new Date(deadline);
//     expiryDate.setHours(0, 0, 0, 0);

//     if (expiryDate < today) {
//       return res.status(400).json({
//         message: "Invalid deadline. Past dates are not allowed.",
//       });
//     }

//     // Image upload
//     let imageUrl = null;
//     if (req.file && req.file.buffer) {
//       const uploaded = await uploadToCloudinary(req.file.buffer, "surplus");
//       imageUrl = uploaded.secure_url;
//     }

//     // Create surplus
//     const surplus = await Surplus.create({
//       title,
//       description,
//       quantity,
//       deadline: expiryDate,
//       imageUrl,
//       postedBy: req.user.id,
//       status: "available",
//     });

//     /* ===========================
//        📧 SEND EMAIL TO ALL NGOs
//        =========================== */

//     const ngos = await User.find({ role: "ngo" }).select("email name");

//     const subject = "Food surplus posted from SDMCET Mess";

//     const text = `A new food surplus has been posted.\n\nQuantity: ${quantity}\nDeadline: ${expiryDate.toDateString()}`;

//     const html = `
//       <p>Hello,</p>
//       <p><strong>SDMCET Mess</strong> has posted a new food surplus.</p>
//       <ul>
//         <li><strong>Quantity:</strong> ${quantity}</li>
//         <li><strong>Deadline:</strong> ${expiryDate.toDateString()}</li>
//       </ul>
//       <p>Please log in to the system to claim the surplus.</p>
//     `;

//     // 🔥 Send emails asynchronously (do NOT block response)
//     ngos.forEach((ngo) => {
//       sendEmail(ngo.email, subject, text, html)
//         .catch(err => console.error("Email failed for:", ngo.email, err.message));
//     });

//     /* =========================== */

//     return res.status(201).json({
//       message: "Surplus posted successfully and NGOs notified",
//       surplus,
//     });

//   } catch (err) {
//     console.error("Create surplus error:", err);
//     return res.status(500).json({ message: "Server error" });
//   }
// };

export const createSurplus = async (req, res) => {
  try {
    const { title, description, quantity, deadline } = req.body;

    // 🔹 Required field validation
    if (!description || !quantity || !deadline) {
      return res.status(400).json({
        message: "description, quantity and deadline are required",
      });
    }

    // 🔹 Deadline validation (no past dates)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiryDate = new Date(deadline);
    expiryDate.setHours(0, 0, 0, 0);

    if (expiryDate < today) {
      return res.status(400).json({
        message: "Invalid deadline. Past dates are not allowed.",
      });
    }

    // 🔹 Format expiry date for email (India locale)
    const formattedExpiry = expiryDate.toLocaleString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    // 🔹 Optional image upload
    let imageUrl = null;
    if (req.file && req.file.buffer) {
      const uploaded = await uploadToCloudinary(req.file.buffer, "surplus");
      imageUrl = uploaded.secure_url;
    }

    // 🔹 Create surplus entry
    const surplus = await Surplus.create({
      title,
      description,
      quantity,
      deadline: expiryDate,
      imageUrl,
      postedBy: req.user.id,
      status: "available",
    });

    /* ==================================================
       📧 EMAIL NOTIFICATION TO ALL NGOs (ASYNC)
       ================================================== */

    const ngos = await User.find({ role: "ngo" }).select("email name");

    const subject = "Food surplus posted from SDMCET Mess";

    const text = `
A new food surplus has been posted from SDMCET Mess.

Quantity: ${quantity}
Expiry Date: ${formattedExpiry}

Please log in to the system and claim before expiry.
`;

    const html = `
      <p>Hello,</p>
      <p><strong>SDMCET Mess</strong> has posted a new food surplus.</p>
      <ul>
        <li><strong>Quantity:</strong> ${quantity}</li>
        <li><strong>Expiry Date:</strong> ${formattedExpiry}</li>
      </ul>
      <p>Please log in to the system and claim the surplus before it expires.</p>
    `;

    // 🔹 Send emails without blocking API response
    ngos.forEach((ngo) => {
      sendEmail(ngo.email, subject, text, html)
        .catch((err) =>
          console.error(`Email failed for ${ngo.email}:`, err.message)
        );
    });

    /* ================================================== */

    return res.status(201).json({
      message: "Surplus posted successfully and NGOs notified",
      surplus,
    });

  } catch (err) {
    console.error("Create surplus error:", err);
    return res.status(500).json({
      message: "Server error",
    });
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

// export const getAvailableSurplus = async (req, res) => {
//   try {
//     const surplus = await Surplus.find({ status: "available" })
//       .sort({ createdAt: -1 });

//     res.status(200).json({ surplus });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };


// export const claimSurplus = async (req, res) => {
//   try {
//     const { surplusId } = req.params;

//     const surplus = await Surplus.findById(surplusId);
//     if (!surplus) return res.status(404).json({ message: "Not found" });

//     // Check if already taken
//     if (surplus.status !== "available") {
//       return res.status(400).json({ message: "Already claimed or unavailable" });
//     }

//     // Check deadline
//     const now = new Date();
//     if (surplus.deadline < now) {
//       surplus.status = "expired";
//       await surplus.save();
//       return res.status(400).json({ message: "Food already expired" });
//     }

//     // Claim
//     surplus.claimedBy = req.user.id;
//     surplus.status = "claimed";
//     await surplus.save();

//     res.status(200).json({ message: "Claimed successfully", surplus });

//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// export const claimSurplus = async (req, res) => {
//   try {
//     const { surplusId } = req.params;

//     // 🔹 Find surplus
//     const surplus = await Surplus.findById(surplusId)
//       .populate("postedBy", "name email")
//       .populate("claimedBy", "name email phone");

//     if (!surplus) {
//       return res.status(404).json({ message: "Surplus not found" });
//     }

//     // 🔹 Check availability
//     if (surplus.status !== "available") {
//       return res.status(400).json({
//         message: "Already claimed or unavailable",
//       });
//     }

//     // 🔹 Check expiry
//     const now = new Date();
//     if (surplus.deadline < now) {
//       surplus.status = "expired";
//       await surplus.save();
//       return res.status(400).json({
//         message: "Food already expired",
//       });
//     }

//     // 🔹 Claim surplus
//     surplus.claimedBy = req.user.id;
//     surplus.status = "claimed";
//     await surplus.save();

//     /* ==================================================
//        📧 EMAIL TO MESS MANAGER (ASYNC)
//        ================================================== */

//     const messManager = surplus.postedBy;
//     const ngo = surplus.claimedBy;

//     // Format pickup deadline
//     const formattedExpiry = surplus.deadline.toLocaleString("en-IN", {
//       day: "2-digit",
//       month: "long",
//       year: "numeric",
//       hour: "2-digit",
//       minute: "2-digit",
//       hour12: true,
//     });

//     const subject = "Food surplus pickup confirmed";

//     const text = `
// Hello ${messManager.name},

// Your food surplus has been claimed by an NGO.

// NGO Name: ${ngo.name}
// NGO Email: ${ngo.email}
// NGO Phone: ${ngo.phone || "Not provided"}

// Pickup Deadline: ${formattedExpiry}

// Please coordinate the pickup accordingly.
// `;

//     const html = `
//       <p>Hello <strong>${messManager.name}</strong>,</p>

//       <p>Your food surplus has been <strong>claimed successfully</strong>.</p>

//       <h4>NGO Details</h4>
//       <ul>
//         <li><strong>Name:</strong> ${ngo.name}</li>
//         <li><strong>Email:</strong> ${ngo.email}</li>
//         <li><strong>Phone:</strong> ${ngo.phone || "Not provided"}</li>
//       </ul>

//       <p><strong>Pickup Deadline:</strong> ${formattedExpiry}</p>

//       <p>Please coordinate with the NGO for a smooth pickup.</p>
//     `;

//     sendEmail(messManager.email, subject, text, html)
//       .catch(err =>
//         console.error("Mess manager email failed:", err.message)
//       );

//     /* ================================================== */

//     return res.status(200).json({
//       message: "Claimed successfully. Mess manager notified.",
//       surplus,
//     });

//   } catch (err) {
//     console.error("Claim surplus error:", err);
//     return res.status(500).json({
//       message: "Server error",
//     });
//   }
// };


export const claimSurplus = async (req, res) => {
  try {
    const { surplusId } = req.params;

    // 1️⃣ Fetch surplus (postedBy populated)
    const surplus = await Surplus.findById(surplusId)
      .populate("postedBy", "name email");

    if (!surplus) {
      return res.status(404).json({ message: "Surplus not found" });
    }

    // 2️⃣ Check availability
    if (surplus.status !== "available") {
      return res.status(400).json({
        message: "Already claimed or unavailable",
      });
    }

    // 3️⃣ Check expiry
    const now = new Date();
    if (surplus.deadline < now) {
      surplus.status = "expired";
      await surplus.save();
      return res.status(400).json({
        message: "Food already expired",
      });
    }

    // 4️⃣ Claim surplus
    surplus.claimedBy = req.user.id;
    surplus.status = "claimed";
    await surplus.save();

    // 5️⃣ Re-fetch surplus WITH NGO populated
    const populatedSurplus = await Surplus.findById(surplusId)
      .populate("postedBy", "name email")
      .populate("claimedBy", "name email phone");

    const messManager = populatedSurplus.postedBy;
    const ngo = populatedSurplus.claimedBy;

    // 6️⃣ Format DATE ONLY (no time)
    const formattedDate = populatedSurplus.deadline.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );

    // 7️⃣ Email content
    const subject = "Food surplus pickup confirmed";

    const text = `
Hello ${messManager.name},

Your food surplus has been claimed by an NGO.

NGO Name: ${ngo.name}
NGO Email: ${ngo.email}
NGO Phone: ${ngo.phone || "Not provided"}

Pickup Date: ${formattedDate}

Please coordinate the pickup accordingly.
`;

    const html = `
      <p>Hello <strong>${messManager.name}</strong>,</p>

      <p>Your food surplus has been <strong>claimed successfully</strong>.</p>
      <h4>NGO Details</h4>
      <ul>
        <li><strong>Name:</strong> ${ngo.name}</li>
        <li><strong>Email:</strong> ${ngo.email}</li>
        <li><strong>Phone:</strong> ${ngo.phone || "Not provided"}</li>
      </ul>

      <p><strong>Pickup Date:</strong> ${formattedDate}</p>

      <p>Please coordinate with the NGO for a smooth pickup.</p>
    `;

    // 8️⃣ Send email (async)
    sendEmail(messManager.email, subject, text, html)
      .catch(err =>
        console.error("Mess manager email failed:", err.message)
      );

    return res.status(200).json({
      message: "Claimed successfully. Mess manager notified.",
      surplus: populatedSurplus,
    });

  } catch (err) {
    console.error("Claim surplus error:", err);
    return res.status(500).json({
      message: "Server error",
    });
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

export const getClaimedSurplus = async (req, res) => {
  try {
    // Must be NGO
    if (req.user.role !== "ngo") {
      return res.status(403).json({ message: "Access denied" });
    }

    const ngoId = req.user.id;

    const claimed = await Surplus.find({
      claimedBy: ngoId
    })
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      message: "Claimed surplus fetched",
      claimed
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};
