"use client";

import { useState, useEffect } from "react";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { PostComposer } from "@/components/content/post-composer";
import { PostCard } from "@/components/content/post-card";
import {
  getPosts,
  createPost,
  publishPostNow,
  deletePost,
} from "@/actions/post.actions";
import { getPages } from "@/actions/page.actions";
import type { PostSummary } from "@/types/post.types";

export default function ContentPage() {
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [pages, setPages] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [postsResult, pagesResult] = await Promise.all([
      getPosts(),
      getPages(),
    ]);
    if (postsResult.success) {
      setPosts(postsResult.data.items);
    }
    if (pagesResult.success) {
      setPages(pagesResult.data.map((p) => ({ id: p.id, name: p.name })));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveDraft = async (data: {
    fbPageId: string;
    title: string;
    body: string;
    mediaUrl: string;
    mediaType: "NONE" | "IMAGE" | "LINK";
  }) => {
    setActionLoading(true);
    const result = await createPost({
      fbPageId: data.fbPageId,
      title: data.title || undefined,
      body: data.body,
      mediaUrl: data.mediaUrl || undefined,
      mediaType: data.mediaType,
    });
    if (result.success) {
      setShowComposer(false);
      await fetchData();
    }
    setActionLoading(false);
  };

  const handlePublishNow = async (data: {
    fbPageId: string;
    title: string;
    body: string;
    mediaUrl: string;
    mediaType: "NONE" | "IMAGE" | "LINK";
  }) => {
    setActionLoading(true);
    // First create, then publish
    const createResult = await createPost({
      fbPageId: data.fbPageId,
      title: data.title || undefined,
      body: data.body,
      mediaUrl: data.mediaUrl || undefined,
      mediaType: data.mediaType,
    });
    if (createResult.success) {
      const publishResult = await publishPostNow(createResult.data.id);
      if (publishResult.success) {
        setShowComposer(false);
      }
      await fetchData();
    }
    setActionLoading(false);
  };

  const handlePublishExisting = async (postId: string) => {
    setActionLoading(true);
    await publishPostNow(postId);
    await fetchData();
    setActionLoading(false);
  };

  const handleDelete = async (postId: string) => {
    if (!confirm("Delete this post?")) return;
    setActionLoading(true);
    await deletePost(postId);
    await fetchData();
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Content</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage your content pool.
          </p>
        </div>
        <Button
          className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
          onClick={() => setShowComposer(!showComposer)}
        >
          <Plus className="h-4 w-4" />
          {showComposer ? "Hide Composer" : "Create Post"}
        </Button>
      </div>

      {/* Composer */}
      {showComposer && (
        <PostComposer
          pages={pages}
          onSaveDraft={handleSaveDraft}
          onPublishNow={handlePublishNow}
          loading={actionLoading}
        />
      )}

      {/* Post list */}
      {posts.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onPublish={handlePublishExisting}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        !showComposer && (
          <EmptyState
            icon={FileText}
            title="No content yet"
            description="Create posts manually or use AI to generate content for your pages."
            action={
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setShowComposer(true)}
              >
                <FileText className="h-3.5 w-3.5" />
                Create your first post
              </Button>
            }
          />
        )
      )}
    </div>
  );
}
