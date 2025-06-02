import { Router, Request, Response } from 'express';
import { storage } from './storage';

export const blogRouter = Router();

// Get all published blog posts
blogRouter.get("/api/blog", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const category = req.query.category as string;
    const search = req.query.search as string;

    let posts;
    if (search) {
      posts = await storage.searchBlogPosts(search, limit);
    } else if (category) {
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
blogRouter.get("/api/blog/featured", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 3;
    const posts = await storage.getFeaturedBlogPosts(limit);
    res.json(posts);
  } catch (error) {
    console.error("Error fetching featured blog posts:", error);
    res.status(500).json({ message: "Failed to fetch featured blog posts" });
  }
});

// Get single blog post by slug
blogRouter.get("/api/blog/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const post = await storage.getBlogPostBySlug(slug);
    
    if (!post) {
      return res.status(404).json({ message: "Blog post not found" });
    }

    res.json(post);
  } catch (error) {
    console.error("Error fetching blog post:", error);
    res.status(500).json({ message: "Failed to fetch blog post" });
  }
});

// Admin endpoints for blog management

// Get all blog posts (including drafts) - for admin
blogRouter.get("/api/admin/blog", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const status = req.query.status as string;
    const posts = await storage.getBlogPosts(status, limit);
    res.json(posts);
  } catch (error) {
    console.error("Error fetching admin blog posts:", error);
    res.status(500).json({ message: "Failed to fetch blog posts" });
  }
});

// Create new blog post
blogRouter.post("/api/admin/blog", async (req: Request, res: Response) => {
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

// Update blog post
blogRouter.put("/api/admin/blog/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { blogPostFormSchema } = await import('@shared/schema');
    const validationResult = blogPostFormSchema.partial().safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "Invalid blog post data", 
        errors: validationResult.error.format() 
      });
    }

    const post = await storage.updateBlogPost(parseInt(id), validationResult.data);
    
    if (!post) {
      return res.status(404).json({ message: "Blog post not found" });
    }

    res.json(post);
  } catch (error) {
    console.error("Error updating blog post:", error);
    res.status(500).json({ message: "Failed to update blog post" });
  }
});

// Delete blog post
blogRouter.delete("/api/admin/blog/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await storage.deleteBlogPost(parseInt(id));
    res.json({ message: "Blog post deleted successfully" });
  } catch (error) {
    console.error("Error deleting blog post:", error);
    res.status(500).json({ message: "Failed to delete blog post" });
  }
});