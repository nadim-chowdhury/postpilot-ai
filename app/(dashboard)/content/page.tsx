"use client";

import { useState, useEffect } from "react";
import { FileText, Plus, Minus, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { Spinner } from "@/components/shared/spinner";
import { ViewModeToggle, type ViewMode } from "@/components/shared/view-mode-toggle";
import { PostComposer } from "@/components/content/post-composer";
import { PostCard } from "@/components/content/post-card";
import { PostListItem } from "@/components/content/post-list-item";
import { AiGenerateDialog } from "@/components/content/ai-generate-dialog";
import { BulkImportDialog } from "@/components/content/bulk-import-dialog";
import { EditPostDialog } from "@/components/content/edit-post-dialog";
import {
  getPosts,
  createPost,
  publishPostNow,
  deletePost,
  updatePost,
} from "@/actions/post.actions";
import { getPages } from "@/actions/page.actions";
import { schedulePost } from "@/actions/schedule.actions";
import type { PostSummary } from "@/types/post.types";

export default function ContentPage() {
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [pages, setPages] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [aiGenerateOpen, setAiGenerateOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<PostSummary | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [schedulingPostId, setSchedulingPostId] = useState<string | null>(null);
  const [scheduleTime, setScheduleTime] = useState("");

  // Filters State
  const [filterPageId, setFilterPageId] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const fetchPosts = async () => {
    const postsResult = await getPosts({
      fbPageId: filterPageId !== "ALL" ? filterPageId : undefined,
      status: filterStatus !== "ALL" ? filterStatus : undefined,
      startDate: filterStartDate || undefined,
      endDate: filterEndDate || undefined,
      search: filterSearch || undefined,
    });
    if (postsResult.success) {
      setPosts(postsResult.data.items);
    }
  };

  const fetchData = async () => {
    const [postsResult, pagesResult] = await Promise.all([
      getPosts({
        fbPageId: filterPageId !== "ALL" ? filterPageId : undefined,
        status: filterStatus !== "ALL" ? filterStatus : undefined,
        startDate: filterStartDate || undefined,
        endDate: filterEndDate || undefined,
        search: filterSearch || undefined,
      }),
      getPages(),
    ]);
    if (postsResult.success) {
      setPosts(postsResult.data.items);
    }
    if (pagesResult.success) {
      setPages(pagesResult.data.map((p) => ({ id: p.id, name: p.name })));
    }
  };

  // Fetch initial data
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };
    init();
  }, []);

  // Fetch updated posts when filters change
  useEffect(() => {
    // Skip first run when loading is true
    if (!loading) {
      fetchPosts();
    }
  }, [filterPageId, filterStatus, filterStartDate, filterEndDate, filterSearch]);

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

  const handleScheduleSubmit = async () => {
    if (!schedulingPostId || !scheduleTime) return;
    setActionLoading(true);
    const result = await schedulePost(schedulingPostId, new Date(scheduleTime));
    if (result.success) {
      setSchedulingPostId(null);
      setScheduleTime("");
      await fetchData();
    } else {
      alert(result.error || "Failed to schedule post");
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="md" />
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setBulkImportOpen(true)}
          >
            <Upload className="h-4 w-4" />
            Bulk Import
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setAiGenerateOpen(true)}
          >
            <Sparkles className="h-4 w-4" />
            Generate with AI
          </Button>
          <Button
            className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={() => setShowComposer(!showComposer)}
          >
            {showComposer ? (
              <Minus className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {showComposer ? "Hide Composer" : "Create Post"}
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-border/40 bg-card p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5 items-end">
          {/* Search */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Search Posts
            </label>
            <input
              type="text"
              placeholder="Search title, body..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground/45 focus:border-brand/50 focus:outline-none"
            />
          </div>

          {/* Page Filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Filter by Page
            </label>
            <select
              value={filterPageId}
              onChange={(e) => setFilterPageId(e.target.value)}
              className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-xs text-foreground focus:border-brand/50 focus:outline-none"
            >
              <option value="ALL">All Pages</option>
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-xs text-foreground focus:border-brand/50 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="APPROVED">Approved</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="PUBLISHING">Publishing</option>
              <option value="POSTED">Posted</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              From Date
            </label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-xs text-foreground focus:border-brand/50 focus:outline-none"
            />
          </div>

          {/* End Date & Reset */}
          <div className="space-y-1.5 flex gap-2 items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                To Date
              </label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-xs text-foreground focus:border-brand/50 focus:outline-none"
              />
            </div>
            {(filterPageId !== "ALL" ||
              filterStatus !== "ALL" ||
              filterStartDate ||
              filterEndDate ||
              filterSearch) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setFilterPageId("ALL");
                  setFilterStatus("ALL");
                  setFilterStartDate("");
                  setFilterEndDate("");
                  setFilterSearch("");
                }}
                className="h-9 text-xs px-2 hover:bg-accent/80 hover:text-foreground text-muted-foreground"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
        <div className="flex justify-end pt-3 border-t border-border/30">
          <ViewModeToggle mode={viewMode} onModeChange={setViewMode} />
        </div>
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
        viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onPublish={handlePublishExisting}
                onSchedule={setSchedulingPostId}
                onDelete={handleDelete}
                onEdit={setEditingPost}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {posts.map((post) => (
              <PostListItem
                key={post.id}
                post={post}
                onPublish={handlePublishExisting}
                onSchedule={setSchedulingPostId}
                onDelete={handleDelete}
                onEdit={setEditingPost}
              />
            ))}
          </div>
        )
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

      {/* Scheduling Modal */}
      {schedulingPostId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSchedulingPostId(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-border/50 bg-card p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Schedule Post
              </h3>
              <p className="text-xs text-muted-foreground">
                Select a publication date and time.
              </p>
            </div>
            <div>
              <input
                type="datetime-local"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-brand/30"
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-border/50 pt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSchedulingPostId(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-brand text-brand-foreground hover:bg-brand/90"
                onClick={handleScheduleSubmit}
                disabled={!scheduleTime || actionLoading}
              >
                Schedule
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AI Generate Dialog */}
      <AiGenerateDialog
        open={aiGenerateOpen}
        onClose={() => setAiGenerateOpen(false)}
        pages={pages}
        onSaved={fetchData}
      />

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        pages={pages}
        onImported={fetchData}
      />

      {/* Edit Post Dialog */}
      <EditPostDialog
        post={editingPost}
        open={!!editingPost}
        onClose={() => setEditingPost(null)}
        pages={pages}
        onSaved={fetchData}
      />
    </div>
  );
}
