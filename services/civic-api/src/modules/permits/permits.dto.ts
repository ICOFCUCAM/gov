import { z } from 'zod';

export const PermitTypeEnum = z.enum([
  'BUILDING',
  'BUSINESS',
  'MARKET_STALL',
  'EVENT',
  'VEHICLE',
  'FOOD_HANDLING',
]);

export const CreatePermitSchema = z.object({
  citizenId: z.string().min(1),
  type: PermitTypeEnum,
  title: z.string().min(3).max(200),
  fields: z.record(z.string()).default({}),
});
export type CreatePermitDto = z.infer<typeof CreatePermitSchema>;

export const DecidePermitSchema = z.object({
  decision: z.enum(['APPROVED', 'DECLINED', 'NEEDS_INFO']),
  note: z.string().max(2000).optional(),
  officerName: z.string().min(1),
  aiClass: z.enum(['A', 'B', 'C', 'D', 'E']).optional(),
});
export type DecidePermitDto = z.infer<typeof DecidePermitSchema>;
