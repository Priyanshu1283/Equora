import { connectToDatabase } from "@/lib/db/connect";
import { Notification, INotification, NotificationType } from "@/lib/models/Notification";
import { triggerUserNotification } from "@/lib/pusher-server";
import mongoose from "mongoose";

interface CreateNotificationInput {
  userId: string;
  groupId?: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string;
  link?: string;
  eventKey?: string; // used for deduplication
}

/**
 * Save notification to MongoDB, then push via Pusher.
 * Pusher failure never blocks the save.
 * Deduplication via eventKey (upsert).
 */
export async function createAndPublishNotification(
  input: CreateNotificationInput
): Promise<INotification | null> {
  try {
    await connectToDatabase();

    const doc: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(input.userId),
      type: input.type,
      title: input.title,
      message: input.message,
      isRead: false,
    };

    if (input.groupId) doc.groupId = new mongoose.Types.ObjectId(input.groupId);
    if (input.relatedId) doc.relatedId = new mongoose.Types.ObjectId(input.relatedId);
    if (input.link) doc.link = input.link;
    if (input.eventKey) doc.eventKey = input.eventKey;

    let notification: INotification;

    // Deduplication: if eventKey exists, check for existing notification
    if (input.eventKey) {
      const existing = await Notification.findOne({ eventKey: input.eventKey });
      if (existing) return existing; // skip duplicate
    }

    notification = await Notification.create(doc);

    // Fire-and-forget Pusher publish
    triggerUserNotification(input.userId, "notification.created", {
      _id: notification._id.toString(),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      groupId: input.groupId,
      isRead: false,
      createdAt: notification.createdAt,
    }).catch((err) => console.error("[NotificationService] Pusher error:", err));

    return notification;
  } catch (err) {
    console.error("[NotificationService] Failed to create notification:", err);
    return null;
  }
}

/**
 * Notify multiple users at once (e.g., all group members except actor).
 */
export async function notifyMany(
  userIds: string[],
  shared: Omit<CreateNotificationInput, "userId" | "eventKey">,
  eventKeyPrefix?: string
): Promise<void> {
  await Promise.all(
    userIds.map((uid, i) =>
      createAndPublishNotification({
        ...shared,
        userId: uid,
        eventKey: eventKeyPrefix ? `${eventKeyPrefix}-${uid}` : undefined,
      })
    )
  );
}

// ─── Typed helper functions per event ────────────────────────────────────────

export const notificationService = {
  /** Someone invited a user to a group */
  groupInvitation: (params: {
    invitedUserId: string;
    groupId: string;
    groupName: string;
    inviterName: string;
    invitationToken: string;
  }) =>
    createAndPublishNotification({
      userId: params.invitedUserId,
      groupId: params.groupId,
      type: "GROUP_INVITATION",
      title: "You have a group invitation",
      message: `${params.inviterName} invited you to join "${params.groupName}".`,
      link: `/join?token=${params.invitationToken}`,
      eventKey: `inv-${params.invitationToken}`,
    }),

  /** Invited user accepted the invitation */
  invitationAccepted: (params: {
    adminId: string;
    groupId: string;
    groupName: string;
    acceptedByName: string;
    invitationId: string;
  }) =>
    createAndPublishNotification({
      userId: params.adminId,
      groupId: params.groupId,
      type: "INVITATION_ACCEPTED",
      title: "Invitation accepted",
      message: `${params.acceptedByName} accepted your invitation to "${params.groupName}".`,
      link: `/groups/${params.groupId}`,
      eventKey: `inv-accepted-${params.invitationId}-${params.adminId}`,
    }),

  /** New member joined */
  memberJoined: (params: {
    adminId: string;
    groupId: string;
    groupName: string;
    memberName: string;
  }) =>
    createAndPublishNotification({
      userId: params.adminId,
      groupId: params.groupId,
      type: "MEMBER_JOINED",
      title: "New member joined",
      message: `${params.memberName} joined "${params.groupName}".`,
      link: `/groups/${params.groupId}`,
    }),

  /** New expense added – notify all participants except actor */
  expenseAdded: (params: {
    participantIds: string[]; // excludes actor
    groupId: string;
    groupName: string;
    actorName: string;
    expenseTitle: string;
    expenseId: string;
    sharePaise?: number;
    formatAmount: (paise: number) => string;
  }) =>
    notifyMany(
      params.participantIds,
      {
        groupId: params.groupId,
        type: "EXPENSE_ADDED",
        title: `New expense in ${params.groupName}`,
        message: `${params.actorName} added "${params.expenseTitle}"${params.sharePaise ? ` — your share: ${params.formatAmount(params.sharePaise)}` : ""}.`,
        relatedId: params.expenseId,
        link: `/groups/${params.groupId}`,
      },
      `expense-added-${params.expenseId}`
    ),

  /** Expense updated – notify affected participants except actor */
  expenseUpdated: (params: {
    participantIds: string[];
    groupId: string;
    actorName: string;
    expenseTitle: string;
    expenseId: string;
  }) =>
    notifyMany(
      params.participantIds,
      {
        groupId: params.groupId,
        type: "EXPENSE_UPDATED",
        title: "Expense updated",
        message: `${params.actorName} updated "${params.expenseTitle}".`,
        relatedId: params.expenseId,
        link: `/groups/${params.groupId}`,
      },
      `expense-updated-${params.expenseId}-${Date.now()}`
    ),

  /** Expense deleted */
  expenseDeleted: (params: {
    participantIds: string[];
    groupId: string;
    actorName: string;
    expenseTitle: string;
  }) =>
    notifyMany(params.participantIds, {
      groupId: params.groupId,
      type: "EXPENSE_DELETED",
      title: "Expense removed",
      message: `${params.actorName} deleted the expense "${params.expenseTitle}".`,
      link: `/groups/${params.groupId}`,
    }),

  /** Settlement recorded – notify receiver */
  settlementRecorded: (params: {
    receiverId: string;
    groupId: string;
    groupName: string;
    payerName: string;
    amountFormatted: string;
    settlementId: string;
  }) =>
    createAndPublishNotification({
      userId: params.receiverId,
      groupId: params.groupId,
      type: "SETTLEMENT_RECORDED",
      title: "Payment received",
      message: `${params.payerName} recorded a payment of ${params.amountFormatted} to you in "${params.groupName}".`,
      relatedId: params.settlementId,
      link: `/groups/${params.groupId}`,
      eventKey: `settlement-${params.settlementId}-${params.receiverId}`,
    }),

  /** Settlement confirmed – notify both parties */
  settlementConfirmed: (params: {
    userIds: string[]; // both payer and receiver excluding actor
    groupId: string;
    groupName: string;
    actorName: string;
    amountFormatted: string;
    settlementId: string;
  }) =>
    notifyMany(
      params.userIds,
      {
        groupId: params.groupId,
        type: "SETTLEMENT_CONFIRMED",
        title: "Settlement confirmed",
        message: `${params.actorName} confirmed a settlement of ${params.amountFormatted} in "${params.groupName}".`,
        relatedId: params.settlementId,
        link: `/groups/${params.groupId}`,
      },
      `settlement-confirmed-${params.settlementId}`
    ),
};
