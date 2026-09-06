import { ImageResponse } from 'next/og';

export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#009C3B',
          borderRadius: '36px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Left half: Argentina */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '90px',
            height: '180px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ flex: 1, backgroundColor: '#74ACDF' }} />
          <div
            style={{
              flex: 1,
              backgroundColor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: '#F6B40E',
              }}
            />
          </div>
          <div style={{ flex: 1, backgroundColor: '#74ACDF' }} />
        </div>

        {/* Right half: Brazil */}
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: '90px',
            height: '180px',
            backgroundColor: '#009C3B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '68px',
              height: '68px',
              backgroundColor: '#FFDF00',
              transform: 'rotate(45deg)',
              position: 'absolute',
            }}
          />
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#002776',
              position: 'absolute',
            }}
          />
        </div>

        {/* White Center Dividing Line */}
        <div
          style={{
            position: 'absolute',
            left: '90px',
            top: 0,
            bottom: 0,
            width: '3px',
            backgroundColor: '#FFFFFF',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
