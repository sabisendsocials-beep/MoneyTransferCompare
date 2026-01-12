import { Router, Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { z } from 'zod';

export const webhookRouter = Router();

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET_TOKEN;

const webhookAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      error: 'Missing or invalid authorization header' 
    });
  }

  const token = authHeader.substring(7);
  
  if (!WEBHOOK_SECRET || token !== WEBHOOK_SECRET) {
    return res.status(403).json({ 
      success: false, 
      error: 'Invalid access token' 
    });
  }

  next();
};

const webhookBlogPostSchema = z.object({
  title: z.string().min(5).max(200),
  content: z.string().min(100),
  excerpt: z.string().optional(),
  slug: z.string().optional(),
  featured_image: z.string().url().optional().nullable(),
  author: z.string().optional().default('SabiSend Team'),
  status: z.enum(['draft', 'published']).optional().default('published'),
  meta_description: z.string().max(160).optional(),
  meta_keywords: z.string().optional(),
  category: z.string().optional().default('money-transfer-guides'),
  tags: z.array(z.string()).optional(),
  featured: z.boolean().optional().default(false),
});

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100);
}

function generateExcerpt(content: string): string {
  const plainText = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return plainText.substring(0, 300) + (plainText.length > 300 ? '...' : '');
}

webhookRouter.post("/api/webhook/blog", webhookAuthMiddleware, async (req: Request, res: Response) => {
  try {
    console.log('[Webhook] Received blog post request');
    
    const validationResult = webhookBlogPostSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      console.log('[Webhook] Validation failed:', validationResult.error.format());
      return res.status(400).json({ 
        success: false,
        error: 'Invalid blog post data', 
        details: validationResult.error.format() 
      });
    }

    const data = validationResult.data;
    
    const slug = data.slug || generateSlug(data.title);
    const excerpt = data.excerpt || generateExcerpt(data.content);
    
    const existingPost = await storage.getBlogPostBySlug(slug);
    if (existingPost) {
      console.log('[Webhook] Updating existing post with slug:', slug);
      const updatedPost = await storage.updateBlogPost(existingPost.id, {
        title: data.title,
        content: data.content,
        excerpt: excerpt,
        featured_image: data.featured_image || undefined,
        author: data.author,
        status: data.status,
        meta_description: data.meta_description,
        meta_keywords: data.meta_keywords,
        category: data.category,
        tags: data.tags,
        featured: data.featured,
      });
      
      return res.status(200).json({ 
        success: true,
        message: 'Blog post updated successfully',
        post: {
          id: updatedPost?.id,
          slug: updatedPost?.slug,
          title: updatedPost?.title,
          status: updatedPost?.status,
          url: `https://sabisend.com/blog/${updatedPost?.slug}`
        }
      });
    }
    
    console.log('[Webhook] Creating new post with slug:', slug);
    const newPost = await storage.createBlogPost({
      title: data.title,
      slug: slug,
      excerpt: excerpt,
      content: data.content,
      featured_image: data.featured_image || undefined,
      author: data.author,
      status: data.status,
      meta_description: data.meta_description,
      meta_keywords: data.meta_keywords,
      category: data.category,
      tags: data.tags,
      featured: data.featured,
    });

    console.log('[Webhook] Blog post created successfully:', newPost.id);
    
    res.status(201).json({ 
      success: true,
      message: 'Blog post created successfully',
      post: {
        id: newPost.id,
        slug: newPost.slug,
        title: newPost.title,
        status: newPost.status,
        url: `https://sabisend.com/blog/${newPost.slug}`
      }
    });
  } catch (error) {
    console.error("[Webhook] Error processing blog post:", error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process blog post' 
    });
  }
});

webhookRouter.get("/api/webhook/health", (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    service: 'SabiSend Blog Webhook',
    timestamp: new Date().toISOString()
  });
});
