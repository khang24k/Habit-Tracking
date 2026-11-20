import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { withAutoSchema } from '@/db/bootstrap';
import { tasks } from '@/db/schema';
import { NotFoundError, handleApiError, requireUser } from '@/lib/api-helpers';
import { updateTaskSchema, uuidSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const taskId = uuidSchema.parse(id);
    const body = await request.json();
    const parsed = updateTaskSchema.parse(body);

    const updates: Partial<typeof tasks.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (parsed.title !== undefined) updates.title = parsed.title;
    if (parsed.notes !== undefined) updates.notes = parsed.notes;
    if (parsed.dueDate !== undefined) updates.dueDate = parsed.dueDate;
    if (parsed.priority !== undefined) updates.priority = parsed.priority;
    if (parsed.category !== undefined) updates.category = parsed.category;
    if (parsed.sortOrder !== undefined) updates.sortOrder = parsed.sortOrder;
    if (parsed.completed !== undefined) {
      updates.completed = parsed.completed;
      updates.completedAt = parsed.completed ? new Date() : null;
    }

    const updated = await withAutoSchema(async () => {
      const db = getDb();
      const [row] = await db
        .update(tasks)
        .set(updates)
        .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)))
        .returning();
      return row ?? null;
    });

    if (!updated) {
      throw new NotFoundError('Không tìm thấy nhiệm vụ.');
    }

    return NextResponse.json({ task: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const taskId = uuidSchema.parse(id);

    const deleted = await withAutoSchema(async () => {
      const db = getDb();
      const [row] = await db
        .delete(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)))
        .returning({ id: tasks.id });
      return row ?? null;
    });

    if (!deleted) {
      throw new NotFoundError('Không tìm thấy nhiệm vụ.');
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
