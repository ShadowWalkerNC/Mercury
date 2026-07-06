/**
 * Mercury web client entry point.
 * Phase 4 implementation. Scaffold only.
 */

const app = document.getElementById('app');
if (app) {
  app.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      font-family: system-ui, sans-serif;
      color: #e2e8f0;
      background: #0f1117;
      flex-direction: column;
      gap: 1rem;
    ">
      <h1 style="font-size: 2rem; font-weight: 700; letter-spacing: -0.02em;">Mercury</h1>
      <p style="color: #94a3b8;">Web client — Phase 4</p>
    </div>
  `;
}
