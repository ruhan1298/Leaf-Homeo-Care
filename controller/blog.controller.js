const Blog = require("../models/Blog");

// Get all blogs for frontend developer (image, title)
exports.GetAllBlogs = async (req, res, next) => {
  try {
    const blogs = await Blog.findAll({
      attributes: ['id', 'Image', 'title', 'type', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({ 
      status: 1, 
      message: "Blogs fetched successfully", 
      blogs 
    });
  } catch (error) {
    console.error("Error fetching blogs:", error.message);
    res.status(500).json({ 
      status: 0, 
      message: "Failed to fetch blogs", 
      error: error.message 
    });
  }
};

// Get blog details by ID for frontend developer
exports.GetBlogDetails = async (req, res, next) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ status: 0, message: "Blog ID is required" });
    }

    const blog = await Blog.findByPk(id);

    if (!blog) {
      return res.status(404).json({ status: 0, message: "Blog not found" });
    }

    res.status(200).json({
      status: 1,
      message: "Blog details fetched successfully",
      blog: {
        id: blog.id,
        Image: blog.Image,
        title: blog.title,
        description: blog.description,
        type: blog.type,
        createdAt: blog.createdAt,
        updatedAt: blog.updatedAt
      }
    });
  } catch (error) {
    console.error("Error fetching blog details:", error.message);
    res.status(500).json({
      status: 0,
      message: "Failed to fetch blog details",
      error: error.message
    });
  }
};
