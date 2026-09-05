export function LogoOasis({
  tamano = 80,
  conTexto = false,
  className = '',
}: {
  tamano?: number;
  conTexto?: boolean;
  className?: string;
}) {
  // Proporción del isotipo (trazo circular + paloma celeste + biblia abierta azul)
  return (
    <div
      className={`inline-flex flex-col items-center justify-center ${className}`}
      style={{ display: 'inline-flex', textAlign: 'center', maxWidth: '100%' }}
    >
      <svg
        width={tamano}
        height={tamano * 0.9}
        viewBox="100 15 350 315"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block', margin: '0 auto' }}
      >
        {/* Trazo circular tipo pincelada azul marino / grisáceo característico */}
        <path
          d="M 285 24
             C 240 18, 175 42, 145 95
             C 115 150, 125 225, 175 275
             C 225 320, 310 325, 365 285
             C 410 250, 435 190, 425 130
             C 420 100, 405 75, 385 58
             C 355 35, 305 32, 275 60
             C 255 78, 250 100, 260 108
             C 268 114, 282 108, 298 90
             C 325 62, 365 72, 385 98
             C 405 125, 405 180, 375 225
             C 335 280, 255 285, 205 245
             C 165 210, 155 155, 178 110
             C 200 68, 250 48, 285 54
             Z"
          fill="#2B5B84"
        />

        {/* Paloma celeste en vuelo */}
        <path
          d="M 225 125
             C 245 130, 268 112, 288 108
             C 292 118, 290 148, 296 168
             C 305 138, 320 115, 345 120
             C 370 125, 395 105, 415 110
             C 392 118, 368 135, 348 132
             C 330 130, 318 145, 305 178
             C 290 185, 278 165, 275 148
             C 260 152, 245 145, 225 125
             Z"
          fill="#29A9E0"
        />

        {/* Biblia abierta - Capas de páginas superiores e inferiores */}
        <path
          d="M 190 220
             C 220 205, 260 200, 296 218
             C 332 200, 372 205, 402 220
             C 372 212, 332 208, 296 226
             C 260 208, 220 212, 190 220
             Z"
          fill="#2B5B84"
        />
        <path
          d="M 195 226
             C 225 211, 262 208, 296 226
             C 330 208, 367 211, 397 226
             L 395 240
             C 365 225, 330 222, 296 238
             C 262 222, 227 225, 197 240
             Z"
          fill="#2B5B84"
        />
        <path
          d="M 180 258
             C 215 240, 258 236, 296 254
             C 334 236, 377 240, 412 258
             L 410 274
             C 375 254, 334 252, 296 270
             C 258 252, 217 254, 182 274
             Z"
          fill="#2B5B84"
        />
        <path
          d="M 292 226
             C 294 240, 294 258, 296 270
             C 298 258, 298 240, 300 226
             Z"
          fill="#2B5B84"
        />
      </svg>

      {conTexto && (
        <div style={{ marginTop: 8 }}>
          <div
            style={{
              fontSize: '1.25rem',
              fontWeight: 500,
              color: '#2B5B84',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}
          >
            Centro de Alabanza Oasis
          </div>
          <div
            style={{
              fontSize: '0.78rem',
              fontWeight: 400,
              color: '#334155',
              marginTop: 4,
              letterSpacing: '-0.01em',
            }}
          >
            Una Iglesia Con Visión, para una Vida de Propósito
          </div>
        </div>
      )}
    </div>
  );
}
