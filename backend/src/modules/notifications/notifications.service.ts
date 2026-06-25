import { Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { Kysely } from 'kysely';
import { DB } from '../../db/types.generated';
import { Observable, Subject } from 'rxjs';
import { v4 as uuid } from 'uuid';

export interface NotificationEvent {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  severity: 'info' | 'warning' | 'critical';
  created_at: string;
  is_read: boolean;
}

export interface NotificationPayload {
  type: string;
  title: string;
  message?: string;
  link?: string;
  severity?: 'info' | 'warning' | 'critical';
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  // Maps userId -> Subject that pushes events to all connected SSE clients for that user
  private readonly userSubjects = new Map<string, Subject<NotificationEvent>>();

  constructor(
    @InjectKysely() private readonly db: Kysely<DB>,
  ) {}

  /**
   * Subscribe to SSE notifications for a given user.
   * Returns an Observable that emits NotificationEvent objects.
   */
  subscribeToUser(userId: string): Observable<NotificationEvent> {
    if (!this.userSubjects.has(userId)) {
      this.userSubjects.set(userId, new Subject<NotificationEvent>());
      this.logger.log(`User ${userId} subscribed to notifications`);
    }

    return this.userSubjects.get(userId)!.asObservable();
  }

  /**
   * Remove a user's SSE subscription.
   */
  unsubscribeUser(userId: string) {
    const subject = this.userSubjects.get(userId);
    if (subject) {
      subject.complete();
      this.userSubjects.delete(userId);
      this.logger.log(`User ${userId} unsubscribed from notifications`);
    }
  }

  /**
   * Publish a notification to a specific user.
   * Persists to DB and delivers in-memory to any connected SSE clients for this user.
   */
  async sendNotification(userId: string, payload: NotificationPayload): Promise<NotificationEvent> {
    const id = uuid();
    const now = new Date();

    // Persist to database
    try {
      await this.db
        .insertInto('in_app_notifications')
        .values({
          id,
          user_id: userId,
          type: payload.type,
          title: payload.title,
          message: payload.message ?? null,
          link: payload.link ?? null,
          severity: payload.severity ?? 'info',
          is_read: false,
        })
        .execute();
    } catch (err) {
      this.logger.error(`Failed to persist notification for user ${userId}`, err);
    }

    // Build the event to emit via SSE
    const event: NotificationEvent = {
      id,
      type: payload.type,
      title: payload.title,
      message: payload.message ?? null,
      link: payload.link ?? null,
      severity: (payload.severity ?? 'info') as 'info' | 'warning' | 'critical',
      created_at: now.toISOString(),
      is_read: false,
    };

    // Deliver to any connected SSE client for this user
    const subject = this.userSubjects.get(userId);
    if (subject) {
      subject.next(event);
    }

    return event;
  }

  /**
   * Send notification to all account managers of a specific client.
   */
  async notifyClientManagers(
    clientId: string,
    payload: NotificationPayload,
  ) {
    const managers = await this.db
      .selectFrom('client_account_managers')
      .innerJoin('users', 'users.id', 'client_account_managers.manager_id')
      .select('users.id')
      .where('client_account_managers.client_id', '=', clientId)
      .where('client_account_managers.deleted_at', 'is', null)
      .where('users.is_active', '=', true)
      .execute();

    for (const manager of managers) {
      await this.sendNotification(manager.id, payload);
    }
  }

  /**
   * List notifications for a user with pagination.
   */
  async listNotifications(userId: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;

    const [{ total }, data] = await Promise.all([
      this.db
        .selectFrom('in_app_notifications')
        .select(this.db.fn.countAll<number>().as('total'))
        .where('user_id', '=', userId)
        .executeTakeFirst()
        .then((r) => ({ total: Number(r?.total ?? 0) })),
      this.db
        .selectFrom('in_app_notifications')
        .selectAll()
        .where('user_id', '=', userId)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute(),
    ]);

    return {
      data: data.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        severity: n.severity,
        is_read: n.is_read,
        created_at: n.created_at.toISOString(),
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get unread notification count for a user.
   */
  async getUnreadCount(userId: string): Promise<number> {
    const result = await this.db
      .selectFrom('in_app_notifications')
      .select(this.db.fn.countAll<number>().as('count'))
      .where('user_id', '=', userId)
      .where('is_read', '=', false)
      .executeTakeFirst();

    return Number(result?.count ?? 0);
  }

  /**
   * Mark a notification as read.
   */
  async markAsRead(notificationId: string, userId: string) {
    await this.db
      .updateTable('in_app_notifications')
      .set({ is_read: true })
      .where('id', '=', notificationId)
      .where('user_id', '=', userId)
      .execute();
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllAsRead(userId: string) {
    await this.db
      .updateTable('in_app_notifications')
      .set({ is_read: true })
      .where('user_id', '=', userId)
      .where('is_read', '=', false)
      .execute();
  }
}
