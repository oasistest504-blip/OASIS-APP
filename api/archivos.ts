import { readdirSync } from 'node:fs';

export default function handler(_req: any, res: any) {
  const salida: any = { node: process.version };
  const mirar = (ruta: string) => {
    try {
      return readdirSync(ruta);
    } catch (e: any) {
      return 'no existe: ' + (e?.message ?? String(e));
    }
  };
  salida.raiz = mirar('/var/task');
  salida.api = mirar('/var/task/api');
  salida.server = mirar('/var/task/server');
  salida.src = mirar('/var/task/src');
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(salida, null, 2));
}
