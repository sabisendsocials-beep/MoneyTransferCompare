import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, Eye, ArrowLeft, Share2 } from "lucide-react";
import { Helmet } from "react-helmet";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  published_at: string;
  category: string;
  featured_image?: string;
  view_count: number;
  featured: boolean;
  tags?: string[];
  meta_description?: string;
  meta_keywords?: string;
}

const BlogPost = () => {
  const { slug } = useParams();
  const [, setLocation] = useLocation();

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['/api/blog', slug],
    queryFn: async () => {
      const response = await fetch(`/api/blog/${slug}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Post not found');
        }
        throw new Error('Failed to fetch blog post');
      }
      return response.json();
    }
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCategory = (category: string) => {
    return category.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatContent = (content: string) => {
    // If content contains HTML tags, render as HTML, otherwise format as plain text
    if (content.includes('<') && content.includes('>')) {
      return <div dangerouslySetInnerHTML={{ __html: content }} />;
    }
    // Fallback for plain text content
    return content.split('\n\n').map((paragraph, index) => (
      <p key={index} className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
        {paragraph}
      </p>
    ));
  };

  const sharePost = () => {
    if (navigator.share && post) {
      navigator.share({
        title: post.title,
        text: post.excerpt,
        url: window.location.href,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded mb-8"></div>
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Post Not Found</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              The blog post you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => setLocation('/blog')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Blog
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{post.title} | SabiSend Blog</title>
        <meta 
          name="description" 
          content={post.meta_description || post.excerpt} 
        />
        {post.meta_keywords && (
          <meta name="keywords" content={post.meta_keywords} />
        )}
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:type" content="article" />
        {post.featured_image && (
          <meta property="og:image" content={post.featured_image} />
        )}
        <meta name="author" content={post.author} />
        <meta name="article:published_time" content={post.published_at} />
        <meta name="article:author" content={post.author} />
        <meta name="article:section" content={formatCategory(post.category)} />
        {post.tags && post.tags.map(tag => (
          <meta key={tag} name="article:tag" content={tag} />
        ))}
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="mb-8"
              onClick={() => setLocation('/blog')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Blog
            </Button>

            {/* Article Header */}
            <article className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
              {post.featured_image && (
                <img 
                  src={post.featured_image} 
                  alt={post.title}
                  className="w-full h-64 md:h-96 object-cover"
                />
              )}
              
              <div className="p-8">
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="secondary">{formatCategory(post.category)}</Badge>
                  {post.featured && <Badge variant="outline">Featured</Badge>}
                  {post.tags && post.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  {post.title}
                </h1>

                <p className="text-xl text-gray-600 dark:text-gray-400 mb-6">
                  {post.excerpt}
                </p>

                <div className="flex items-center justify-between border-t border-b border-gray-200 dark:border-gray-700 py-4 mb-8">
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDate(post.published_at)}
                    </span>
                    <span className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      {post.view_count} views
                    </span>
                    <span>By {post.author}</span>
                  </div>
                  
                  {navigator.share && (
                    <Button variant="outline" size="sm" onClick={sharePost}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  )}
                </div>

                {/* Article Content */}
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  {formatContent(post.content)}
                </div>

                <Separator className="my-8" />

                {/* Article Footer */}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Published on {formatDate(post.published_at)} by {post.author}
                  </div>
                  <Button onClick={() => setLocation('/blog')}>
                    More Articles
                  </Button>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </>
  );
};

export default BlogPost;