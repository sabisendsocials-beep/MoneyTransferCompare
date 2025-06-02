import { Router, Request, Response } from 'express';
import { storage } from '../storage';

const blogRouter = Router();

// Get all published blog posts
blogRouter.get("/", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const category = req.query.category as string;
    
    let posts;
    if (category) {
      posts = await storage.getBlogPostsByCategory(category, limit);
    } else {
      posts = await storage.getPublishedBlogPosts(limit);
    }
    
    res.json(posts);
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    res.status(500).json({ message: "Failed to fetch blog posts" });
  }
});

// Get featured blog posts
blogRouter.get("/featured", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 3;
    const posts = await storage.getFeaturedBlogPosts(limit);
    res.json(posts);
  } catch (error) {
    console.error("Error fetching featured blog posts:", error);
    res.status(500).json({ message: "Failed to fetch featured blog posts" });
  }
});

// Get a single blog post by slug (including drafts for preview)
blogRouter.get("/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { preview } = req.query;
    
    const post = await storage.getBlogPostBySlug(slug);
    
    if (!post) {
      return res.status(404).json({ message: "Blog post not found" });
    }
    
    // Only allow draft posts to be viewed if preview=true
    if (post.status !== 'published' && !preview) {
      return res.status(404).json({ message: "Blog post not found" });
    }
    
    res.json(post);
  } catch (error) {
    console.error("Error fetching blog post:", error);
    res.status(500).json({ message: "Failed to fetch blog post" });
  }
});

// Create a new blog post (admin only)
blogRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { blogPostFormSchema } = await import('@shared/schema');
    const validationResult = blogPostFormSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "Invalid blog post data", 
        errors: validationResult.error.format() 
      });
    }
    
    const post = await storage.createBlogPost(validationResult.data);
    res.status(201).json(post);
  } catch (error) {
    console.error("Error creating blog post:", error);
    res.status(500).json({ message: "Failed to create blog post" });
  }
});

// Update a blog post (admin only)
blogRouter.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const postId = parseInt(id);
    
    if (isNaN(postId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }
    
    const { blogPostFormSchema } = await import('@shared/schema');
    const validationResult = blogPostFormSchema.partial().safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "Invalid blog post data", 
        errors: validationResult.error.format() 
      });
    }
    
    const updatedPost = await storage.updateBlogPost(postId, validationResult.data);
    
    if (!updatedPost) {
      return res.status(404).json({ message: "Blog post not found" });
    }
    
    res.json(updatedPost);
  } catch (error) {
    console.error("Error updating blog post:", error);
    res.status(500).json({ message: "Failed to update blog post" });
  }
});

// Delete a blog post (admin only)
blogRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const postId = parseInt(id);
    
    if (isNaN(postId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }
    
    await storage.deleteBlogPost(postId);
    res.json({ message: "Blog post deleted successfully" });
  } catch (error) {
    console.error("Error deleting blog post:", error);
    res.status(500).json({ message: "Failed to delete blog post" });
  }
});

// Search blog posts
blogRouter.get("/search/:query", async (req: Request, res: Response) => {
  try {
    const { query } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const posts = await storage.searchBlogPosts(query, limit);
    res.json(posts);
  } catch (error) {
    console.error("Error searching blog posts:", error);
    res.status(500).json({ message: "Failed to search blog posts" });
  }
});

export default blogRouter;