import { z } from 'zod';

/** Schema for accepting or rejecting an exchange request */
export const exchangeActionSchema = z.object({
  action: z.enum(['ACCEPTED', 'REJECTED']),
});
