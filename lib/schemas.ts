import { z } from "zod";
import { PROCESSES } from "./processes";
import type { GeometryStats, Machine, Project, Shop } from "./types";

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

export const geometryStatsSchema = z.object({
  // Nonnegative, not positive: a zero-thickness surface mesh is still readable.
  boundingBoxMm: z.object({
    x: z.number().nonnegative(),
    y: z.number().nonnegative(),
    z: z.number().nonnegative(),
  }),
  volumeCm3: z.number().nonnegative(),
  surfaceAreaCm2: z.number().nonnegative(),
  triangleCount: z.number().int().positive(),
  isWatertight: z.boolean(),
  thinWallWarning: z.boolean().optional(),
}) satisfies z.ZodType<GeometryStats>;

export const PROJECT_ID_PATTERN = /^[A-Za-z0-9_-]{10}$/;

export const projectSchema = z.object({
  id: z.string().regex(PROJECT_ID_PATTERN),
  name: z.string().min(1),
  createdAt: z.iso.datetime(),
  notes: z.string(),
  targetQuantity: z.number().int().positive(),
  budgetUsd: z.number().positive().optional(),
  materialHints: z.array(z.string()).optional(),
  cadFileUrl: z.string().optional(),
  imageUrls: z.array(z.string()),
  geometry: geometryStatsSchema.optional(),
  // Phase 2 replaces this with a full analysisSchema.
  analysis: z.custom<NonNullable<Project["analysis"]>>().optional(),
  renders: z.array(z.string()).optional(),
}) satisfies z.ZodType<Project>;
