import Notice from "../../models/notice.model.js";
import { uploadToCloudinary } from "../../middlewares/uploadCloudinary.js";

export const createNotice = async (req, res) => {
  try {
    const { title, message } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: "Title and message are required" });
    }

    let imageUrl = null;

    // If image is uploaded
    if (req.file && req.file.buffer) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, "notices");
      imageUrl = uploadResult.secure_url;
    }

    const notice = await Notice.create({
      title,
      message,
      imageUrl,
      postedBy: req.user.id,
      postedRole: req.user.role
    });

    res.status(201).json({
      message: "Notice posted successfully",
      notice
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const getNotices = async (req, res) => {
  try {
    const notices = await Notice.find()
      .sort({ createdAt: -1 })
      .populate("postedBy", "name role");

    res.status(200).json({ notices });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
