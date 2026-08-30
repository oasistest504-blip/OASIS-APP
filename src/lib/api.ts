async function pedirJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  const texto = await res.text();
  let obj: any = {};
  try {
    obj = texto ? JSON.parse(texto) : {};
  } catch {
    throw new Error(`El servidor respondió algo que no se pudo leer: ${texto.slice(0, 120)}`);
  }

  if (!res.ok) {
    throw new Error(obj.mensaje || obj.error || `Error del servidor (${res.status})`);
  }

  return obj as T;
}

export const api = {
  estadoWhatsApp() {
    return pedirJson<{
      conectado: boolean;
      modoSimulado: boolean;
      numero?: string;
      nombreVerificado?: string;
      calidad?: string;
      limiteMensajes?: string;
      mensaje?: string;
    }>('/api/whatsapp/estado');
  },

  enviarPrueba(telefono: string, plantilla: string, variables: string[]) {
    return pedirJson<{
      simulado: boolean;
      enviados: number;
      detalle: any[];
    }>('/api/whatsapp/prueba', {
      method: 'POST',
      body: JSON.stringify({ telefono, plantilla, variables }),
    });
  },

  enviarPlantilla(datos: {
    personaId: string;
    telefono: string;
    plantilla: string;
    variables: string[];
  }) {
    return pedirJson<{ ok: boolean; simulado?: boolean }>('/api/whatsapp/enviar', {
      method: 'POST',
      body: JSON.stringify(datos),
    });
  },

  enviarDifusion(datos: {
    plantilla: string;
    grupo: string;
    destinatarios: { id: string; nombre: string; telefono: string }[];
  }) {
    return pedirJson<{ total: number; enviados: number; fallidos: number; simulado: boolean }>(
      '/api/whatsapp/difundir',
      {
        method: 'POST',
        body: JSON.stringify(datos),
      },
    );
  },

  correrSecuencia() {
    return pedirJson<{ revisadas: number; enviados: number }>('/api/secuencia/correr', {
      method: 'POST',
    });
  },
};
