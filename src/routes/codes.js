import express from 'express';
import { isValidCode, canUseCode, requireParentForAffiliate } from '../validators.js';

export default function registerCodeRoutes({ codeService }) {
  if (!codeService) {
    throw new Error('A codeService implementation is required');
  }

  const router = express.Router();

  router.post('/', async (req, res, next) => {
    try {
      const payload = req.body ?? {};

      if (!isValidCode(payload.code)) {
        return res.status(400).json({ error: 'Invalid code format' });
      }

      try {
        requireParentForAffiliate(payload);
      } catch (validationError) {
        return res.status(400).json({ error: validationError.message });
      }

      const created = await codeService.createCode(payload);
      return res.status(201).json(created);
    } catch (error) {
      return next(error);
    }
  });

  router.post('/:code/use', async (req, res, next) => {
    try {
      const { code } = req.params;

      if (!isValidCode(code)) {
        return res.status(400).json({ error: 'Invalid code format' });
      }

      const codeRecord = await codeService.findByCode(code);

      if (!codeRecord) {
        return res.status(404).json({ error: 'Code not found' });
      }

      if (!canUseCode(codeRecord)) {
        return res.status(409).json({ error: 'Code cannot be used' });
      }

      const updated = await codeService.registerUse(codeRecord);
      return res.status(200).json(updated);
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
