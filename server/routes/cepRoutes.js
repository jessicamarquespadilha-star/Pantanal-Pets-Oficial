import { Router } from 'express';
import { consultarCep } from '../controllers/cepController.js';

const router = Router();

router.get('/:cep', consultarCep);

export default router;
