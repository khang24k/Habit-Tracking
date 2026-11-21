import { z } from 'zod';
import {
  CATEGORY_KEYS,
  FREQUENCY_KEYS,
  HABIT_COLOR_KEYS,
  PRIORITY_KEYS,
  daysOfWeekForFrequency,
} from './constants';
import { isValidDateKey } from './dates';

export const uuidSchema = z.string().uuid('ID không hợp lệ.');

export const dateKeySchema = z
  .string()
  .refine(isValidDateKey, 'Ngày phải có định dạng hợp lệ YYYY-MM-DD.');

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Tên hiển thị phải có ít nhất 2 ký tự.')
      .max(60, 'Tên hiển thị tối đa 60 ký tự.'),
    email: z
      .string()
      .trim()
      .email('Email không hợp lệ.')
      .transform((v) => v.toLowerCase()),
    password: z
      .string()
      .min(6, 'Mật khẩu phải có ít nhất 6 ký tự.')
      .max(100, 'Mật khẩu tối đa 100 ký tự.'),
    confirmPassword: z.string().optional(),
    timezone: z.string().trim().min(1).max(60).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.confirmPassword !== undefined &&
      data.confirmPassword !== data.password
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Mật khẩu xác nhận không khớp.',
      });
    }
  });

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Email không hợp lệ.')
    .transform((v) => v.toLowerCase()),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu.'),
});

export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập tên nhiệm vụ.')
    .max(200, 'Tên nhiệm vụ tối đa 200 ký tự.'),
  notes: z
    .string()
    .trim()
    .max(2000, 'Ghi chú tối đa 2000 ký tự.')
    .optional()
    .nullable(),
  dueDate: dateKeySchema,
  priority: z.enum(PRIORITY_KEYS).default('medium'),
  category: z.enum(CATEGORY_KEYS).default('personal'),
});

export const updateTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Tên nhiệm vụ không được để trống.')
      .max(200, 'Tên nhiệm vụ tối đa 200 ký tự.')
      .optional(),
    notes: z
      .string()
      .trim()
      .max(2000, 'Ghi chú tối đa 2000 ký tự.')
      .optional()
      .nullable(),
    dueDate: dateKeySchema.optional(),
    priority: z.enum(PRIORITY_KEYS).optional(),
    category: z.enum(CATEGORY_KEYS).optional(),
    completed: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(100000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Không có dữ liệu cần cập nhật.',
  });

const reminderTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ nhắc phải theo định dạng HH:MM.')
  .optional()
  .nullable()
  .or(z.literal('').transform(() => null));

const dayNumberSchema = z.number().int().min(0).max(6);

export const createHabitSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Vui lòng nhập tên thói quen.')
      .max(140, 'Tên thói quen tối đa 140 ký tự.'),
    description: z
      .string()
      .trim()
      .max(500, 'Mô tả tối đa 500 ký tự.')
      .optional()
      .nullable(),
    category: z.enum(CATEGORY_KEYS).default('health'),
    color: z.enum(HABIT_COLOR_KEYS).default('emerald'),
    frequency: z.enum(FREQUENCY_KEYS).default('daily'),
    daysOfWeek: z.array(dayNumberSchema).optional(),
    reminderTime: reminderTimeSchema,
    sortOrder: z.number().int().min(0).max(100000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.frequency === 'custom') {
      const normalized = daysOfWeekForFrequency('custom', data.daysOfWeek);
      if (normalized.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['daysOfWeek'],
          message: 'Vui lòng chọn ít nhất 1 ngày trong tuần.',
        });
      }
    }
  })
  .transform((data) => ({
    ...data,
    daysOfWeek: daysOfWeekForFrequency(data.frequency, data.daysOfWeek),
  }));

export const updateHabitSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Tên thói quen không được để trống.')
      .max(140, 'Tên thói quen tối đa 140 ký tự.')
      .optional(),
    description: z
      .string()
      .trim()
      .max(500, 'Mô tả tối đa 500 ký tự.')
      .optional()
      .nullable(),
    category: z.enum(CATEGORY_KEYS).optional(),
    color: z.enum(HABIT_COLOR_KEYS).optional(),
    frequency: z.enum(FREQUENCY_KEYS).optional(),
    daysOfWeek: z.array(dayNumberSchema).optional(),
    reminderTime: reminderTimeSchema,
    archived: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(100000).optional(),
  })
  .superRefine((data, ctx) => {
    if (Object.keys(data).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Không có dữ liệu cần cập nhật.',
      });
    }
    if (data.frequency === 'custom') {
      const normalized = daysOfWeekForFrequency('custom', data.daysOfWeek);
      if (normalized.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['daysOfWeek'],
          message: 'Vui lòng chọn ít nhất 1 ngày trong tuần.',
        });
      }
    }
  });

export const toggleHabitSchema = z.object({
  date: dateKeySchema,
  completed: z.boolean().optional(),
});
