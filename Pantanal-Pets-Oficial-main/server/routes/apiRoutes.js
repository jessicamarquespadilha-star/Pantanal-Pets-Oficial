import { registrarControladores } from '../controllers/apiController.js';

/**
 * Camada de rotas: apenas associa o prefixo HTTP à camada Controller.
 */
export function registrarRotas(app, deps) {
  registrarControladores(app, deps);
}
