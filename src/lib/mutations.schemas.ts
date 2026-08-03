import { z } from "zod";

const payloadSchema = z.record(z.string(), z.unknown());

export const persistMutationInputSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("plan-create"), payload: payloadSchema }),
  z.object({ operation: z.literal("plan-update"), id: z.string().min(1), payload: payloadSchema }),
  z.object({ operation: z.literal("plan-delete"), id: z.string().min(1) }),
  z.object({ operation: z.literal("partner-create"), payload: payloadSchema }),
  z.object({ operation: z.literal("partner-update"), id: z.string().min(1), payload: payloadSchema }),
  z.object({ operation: z.literal("partner-delete"), id: z.string().min(1) }),
  z.object({ operation: z.literal("finance-create"), payload: payloadSchema }),
  z.object({ operation: z.literal("finance-update"), id: z.string().min(1), payload: payloadSchema }),
  z.object({ operation: z.literal("finance-delete"), id: z.string().min(1) }),
  z.object({ operation: z.literal("discount-create"), payload: payloadSchema }),
  z.object({ operation: z.literal("discount-update"), id: z.string().min(1), payload: payloadSchema }),
  z.object({ operation: z.literal("discount-delete"), id: z.string().uuid() }),
  z.object({ operation: z.literal("client-delete"), id: z.string().min(1) }),
  z.object({ operation: z.literal("movement-delete"), id: z.string().min(1), clientId: z.string().min(1).nullable(), clientPatch: payloadSchema.nullable() }),
  z.object({ operation: z.literal("closing-update"), id: z.string().uuid(), payload: payloadSchema }),
  z.object({ operation: z.literal("closing-delete"), id: z.string().uuid() }),
  z.object({ operation: z.literal("closing-mau-update"), itemId: z.string().uuid(), closingId: z.string().uuid(), itemPayload: payloadSchema, closingPayload: payloadSchema, financeId: z.string().nullable(), financePayload: payloadSchema.nullable() }),
  z.object({ operation: z.literal("kanban-create"), payload: payloadSchema }),
  z.object({ operation: z.literal("kanban-update"), id: z.string().min(1), payload: payloadSchema }),
  z.object({ operation: z.literal("kanban-delete"), id: z.string().min(1) }),
  z.object({ operation: z.literal("admin-user-create"), payload: payloadSchema }),
  z.object({ operation: z.literal("admin-user-update"), id: z.string().uuid(), payload: payloadSchema }),
  z.object({ operation: z.literal("admin-user-delete"), id: z.string().uuid(), email: z.string().email() }),
  z.object({ operation: z.literal("admin-permission-upsert"), email: z.string().email(), module: z.string().min(1).max(50), payload: payloadSchema }),
]);