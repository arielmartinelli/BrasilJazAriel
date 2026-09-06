import { ImageResponse } from 'next/og';

export const alt = 'Nossa História — Ariel, Jazmín & Bruno en Brasil';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #064e3b 0%, #047857 40%, #0f766e 100%)',
          position: 'relative',
          padding: '48px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Decorative Top Accent Bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '12px',
            background: 'linear-gradient(90deg, #74ACDF 0%, #F6B40E 30%, #009C3B 70%, #FFDF00 100%)',
          }}
        />

        {/* Central Card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '36px',
            padding: '50px 70px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '2px solid rgba(255, 255, 255, 0.8)',
            maxWidth: '1000px',
            textAlign: 'center',
          }}
        >
          {/* Badge Flag Logo Graphic */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100px',
              height: '100px',
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
              position: 'relative',
              marginBottom: '24px',
              border: '3px solid #E2E8F0',
            }}
          >
            {/* Left: Argentina */}
            <div
              style={{
                width: '50px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ flex: 1, backgroundColor: '#74ACDF' }} />
              <div style={{ flex: 1, backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#F6B40E' }} />
              </div>
              <div style={{ flex: 1, backgroundColor: '#74ACDF' }} />
            </div>

            {/* Right: Brazil */}
            <div
              style={{
                width: '50px',
                height: '100%',
                backgroundColor: '#009C3B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#FFDF00',
                  transform: 'rotate(45deg)',
                  position: 'absolute',
                }}
              />
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: '#002776',
                  position: 'absolute',
                }}
              />
            </div>
          </div>

          {/* Subtitle tag */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              color: '#065F46',
              padding: '8px 20px',
              borderRadius: '9999px',
              fontSize: '18px',
              fontWeight: 700,
              letterSpacing: '1px',
              marginBottom: '16px',
            }}
          >
            DIARIO FAMILIAR & MAPA INTERACTIVO
          </div>

          {/* Main Title */}
          <div
            style={{
              fontSize: '62px',
              fontWeight: 900,
              color: '#0F172A',
              letterSpacing: '-1.5px',
              lineHeight: 1.1,
              marginBottom: '14px',
            }}
          >
            Nossa História
          </div>

          {/* Protagonists */}
          <div
            style={{
              fontSize: '26px',
              fontWeight: 700,
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <span>Ariel</span>
            <span style={{ color: '#10B981' }}>•</span>
            <span>Jazmín</span>
            <span style={{ color: '#10B981' }}>•</span>
            <span style={{ color: '#D97706' }}>Bruno 🐶</span>
          </div>

          {/* Route Description */}
          <div
            style={{
              fontSize: '20px',
              color: '#64748B',
              fontWeight: 500,
            }}
          >
            Córdoba (Arg) ── Paso de los Libres ── Brasil 🌴
          </div>
        </div>

        {/* Footer Brand */}
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '16px',
            fontWeight: 600,
          }}
        >
          <span>🌴 Nossa História em Brasil</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
