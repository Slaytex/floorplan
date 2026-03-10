// ── INIT ──
defaults();
buildPanel();
render();
initView();
updateDimDisplay();
initSync(); // real-time collaboration — activates only when ?room= param is present
setStatus('Wall tool active — click any wall section to paint');
