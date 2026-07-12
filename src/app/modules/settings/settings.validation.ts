import { z } from 'zod';

export const updateSettingsValidationSchema = z.object({
  body: z.object({
    logoLight: z.string().optional(),
    logoDark: z.string().optional(),
    footerDescription: z.string().optional(),
    footerAddress: z.string().optional(),
    footerPhone: z.string().optional(),
    footerEmail: z.string().optional(),
    footerFacebook: z.string().optional(),
    footerInstagram: z.string().optional(),
    footerTwitter: z.string().optional(),
  }),
});
