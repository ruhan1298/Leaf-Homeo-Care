const Blog = require("../../models/Blog");

exports.CreateBlog = async (req, res, next) => {
  console.log("=== CREATE BLOG START ===");
  try {
    console.log("Request body keys:", Object.keys(req.body));
    console.log("Request body:", req.body);
    console.log("Request file:", req.file);
    
    const { title, description, type } = req.body;
    
    console.log("Extracted values - title:", title, "description length:", description?.length, "type:", type);
    
    // Validate required fields
    if (!title || title.trim() === '') {
      console.log("Validation failed: Title is required");
      return res.status(400).json({ status: 0, message: "Title is required" });
    }
    
    if (!type || !['Patient', 'Doctor'].includes(type)) {
      console.log("Validation failed: Type must be either Patient or Doctor");
      return res.status(400).json({ status: 0, message: "Type must be either Patient or Doctor" });
    }
    
    // Handle image - use req.file for single upload
    const Image = req.file ? req.file.path : null;
    console.log("Image path:", Image);

    console.log("Attempting to create blog in database...");
    const blog = await Blog.create({
      Image,
      title: title.trim(),
      description,
      type,
    });
    
    console.log("Blog created successfully:", blog);
    
    res.status(201).json({ status: 1, message: "Blog created successfully", blog });
  } catch (error) {
    console.error("=== ERROR CREATING BLOG ===");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    if (error.errors) {
      console.error("Validation errors:", error.errors);
    }
    
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => err.message);
      return res.status(400).json({ 
        status: 0, 
        message: "Validation error", 
        errors: validationErrors 
      });
    }
    
    if (error.name === 'SequelizeDatabaseError') {
      return res.status(500).json({ 
        status: 0, 
        message: "Database error", 
        error: error.message 
      });
    }
    
    res.status(500).json({ 
      status: 0, 
      message: "Failed to create blog", 
      error: error.message 
    });
  }
};
exports.GetBlogs = async (req, res, next) => {
  try {
    const blogs = await Blog.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json({ status: 1, message: "Blogs fetched successfully", blogs });
  } catch (error) {
    console.error("Error fetching blogs:", error.message);
    res.status(500).json({ 
      status: 0, 
      message: "Failed to fetch blogs", 
      error: error.message 
    });
  }
};

exports.UpdateBlog = async (req, res, next) => {
  try {
    const { id, title, description, type } = req.body;

    if (!id) {
      return res.status(400).json({ status: 0, message: "Blog ID is required in the body" });
    }

    const blog = await Blog.findByPk(id);

    if (!blog) {
      return res.status(404).json({ status: 0, message: "Blog not found" });
    }

    // Handle image - use req.file for single upload
    const Image = req.file ? req.file.path : blog.Image;

    // Validate type if provided
    if (type && !['Patient', 'Doctor'].includes(type)) {
      return res.status(400).json({ status: 0, message: "Type must be either Patient or Doctor" });
    }

    await blog.update({
      Image,
      title: title !== undefined ? title.trim() : blog.title,
      description: description !== undefined ? description : blog.description,
      type: type !== undefined ? type : blog.type,
    });

    res.status(200).json({ status: 1, message: "Blog updated successfully", blog });
  } catch (error) {
    console.error("Error updating blog:", error.message);
    
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => err.message);
      return res.status(400).json({ 
        status: 0, 
        message: "Validation error", 
        errors: validationErrors 
      });
    }
    
    res.status(500).json({ 
      status: 0, 
      message: "Failed to update blog", 
      error: error.message 
    });
  }
};

exports.DeleteBlog = async (req, res, next) => {
  try {
    const { id }  = req.body;

    if (!id) {
      return res.status(400).json({ status: 0, message: "Blog ID is required in the body" });
    }

    const blog = await Blog.findByPk(id);

    if (!blog) {
      return res.status(404).json({ status: 0, message: "Blog not found" });
    }

    await blog.destroy();

    res.status(200).json({ status: 1, message: "Blog deleted successfully" });
  } catch (error) {
    console.error("Error deleting blog:", error.message);
    res.status(500).json({ 
      status: 0, 
      message: "Failed to delete blog", 
      error: error.message 
    });
  }
};

// Get blog details by ID for frontend developer
exports.GetBlogById = async (req, res, next) => {
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
    console.error("Error fetching blog by ID:", error.message);
    res.status(500).json({
      status: 0,
      message: "Failed to fetch blog details",
      error: error.message
    });
  }
};