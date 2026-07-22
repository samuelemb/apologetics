import { redirect } from "next/navigation";

import { moderateContentCommentAction } from "@/app/(public)/content-comment-actions";
import { AdminEmptyState, AdminPageHeader, AdminTableCard, adminTableCellClass, adminTableHeaderCellClass } from "@/components/admin/admin-listing";
import { Button } from "@/components/ui/button";
import { ContentCommentStatus } from "@/generated/prisma/enums";
import { requireAdmin } from "@/lib/auth/guards";
import { canModerateComments } from "@/lib/auth/permissions";
import { listContentCommentsForModeration } from "@/services/content-comment.service";

export default async function AdminCommentsPage() {
  const admin = await requireAdmin();
  if (!canModerateComments(admin.role)) redirect("/admin?error=forbidden");
  const comments = await listContentCommentsForModeration(admin);
  return <div className="mx-auto w-full max-w-[1600px] space-y-6"><AdminPageHeader title="Comments" description="Moderate public discussions across News, Events, and Magazine issues." /><AdminTableCard emptyState={!comments.length ? <AdminEmptyState title="No comments yet" description="Public comments will appear here for moderation." /> : undefined}>{comments.length ? <table className="w-full min-w-[1000px] text-left"><thead className="border-b border-admin-border bg-admin-background/80"><tr><th className={adminTableHeaderCellClass}>Author</th><th className={adminTableHeaderCellClass}>Content</th><th className={adminTableHeaderCellClass}>Comment</th><th className={adminTableHeaderCellClass}>Status</th><th className={adminTableHeaderCellClass}>Actions</th></tr></thead><tbody>{comments.map((comment) => <tr key={comment.id} className="border-b border-admin-border last:border-0"><td className={adminTableCellClass}><p className="font-medium">{comment.author.name}</p><p className="text-xs text-admin-muted-text">{comment.author.email}</p></td><td className={adminTableCellClass}>{comment.contentType}<p className="text-xs text-admin-muted-text">{comment.contentId}</p></td><td className={adminTableCellClass}><p className="max-w-xl whitespace-pre-wrap">{comment.body || "Deleted comment"}</p></td><td className={adminTableCellClass}>{comment.status}</td><td className={adminTableCellClass}><div className="flex gap-2">{comment.status === ContentCommentStatus.PUBLISHED ? <form action={moderateContentCommentAction.bind(null, comment.id, "hide")}><Button type="submit" variant="outline">Hide</Button></form> : null}{comment.status !== ContentCommentStatus.DELETED ? <form action={moderateContentCommentAction.bind(null, comment.id, "delete")}><Button type="submit" variant="destructive">Delete</Button></form> : null}</div></td></tr>)}</tbody></table> : null}</AdminTableCard></div>;
}
