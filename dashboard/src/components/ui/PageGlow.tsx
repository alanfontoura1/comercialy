export function PageGlow() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      <div style={{
        position: 'absolute', top: '-80px', right: '-80px',
        width: '700px', height: '550px',
        background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.15) 0%, transparent 68%)',
      }} />
      <div style={{
        position: 'absolute', bottom: '-120px', left: '-80px',
        width: '550px', height: '450px',
        background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.10) 0%, transparent 68%)',
      }} />
    </div>
  );
}
