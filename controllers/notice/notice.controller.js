import Notice from "../../models/notice.model.js";

export const createNotice = async (req, res) => {
  try {
    const { title, message, imageUrl } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: "Title and message are required" });
    }

    const notice = await Notice.create({
      title,
      message,
      imageUrl: imageUrl || null,
      postedBy: req.user.id,
      postedRole: req.user.role
    });

    return res.status(201).json({
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
