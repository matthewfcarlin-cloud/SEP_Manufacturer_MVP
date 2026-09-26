import { z } from "zod";
import { PROCESSES } from "./processes";
import type { Machine, Shop } from "./types";

const dimsMm = z.object({
  x: z.number().positive(),
  y: z.number().positive(),
  z: z.number().positive(),
});

export const processSchema = z.enum(PROCESSES);

export const machineSchema = z.object({
  type: processSchema,
  model: z.string().min(1),
  envelopeMm: dimsMm,
  materials: z.array(z.string().min(1)).min(1),
  idleThisMonth: z.boolean(),
  idleHoursPerWeek: z.number().positive().max(168).optional(),
}) satisfies z.ZodType<Machine>;

export const shopSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    neighborhood: z.string().min(1),
    description: z.string().min(1),
    machines: z.array(machineSchema).min(1),
    minOrderQty: z.number().int().positive(),
    maxOrderQty: z.number().int().positive(),
    typicalLeadDays: z.number().int().positive(),
    specialties: z.array(z.string().min(1)),
    isDemoData: z.literal(true),
  })
  .refine((s) => s.minOrderQty <= s.maxOrderQty, {
    message: "minOrderQty must be <= maxOrderQty",
  }) satisfies z.ZodType<Shop>;

export const shopsSchema = z.array(shopSchema).refine(
  (shops) => new Set(shops.map((s) => s.id)).size === shops.length,
  { message: "shop ids must be unique" },
);
