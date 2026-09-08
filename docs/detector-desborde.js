/**
 * DETECTOR DE DESBORDE LATERAL
 *
 * Pegar en la consola del navegador (F12 -> Console) con el sitio abierto y
 * el modo teléfono activado (Ctrl+Shift+M).
 *
 * Lista los elementos que se salen del ancho de la pantalla y les pinta un
 * borde rojo para verlos. Si no encuentra nada, no hay scroll lateral.
 */
(() => {
  const docWidth = document.documentElement.clientWidth;
  const offenders = [];

  document.querySelectorAll('*').forEach((el) => {
    const rect = el.getBoundingClientRect();
    // Se ignora lo que no ocupa lugar y los elementos fuera de pantalla a propósito.
    if (rect.width === 0 || rect.height === 0) return;
    if (getComputedStyle(el).position === 'fixed') return;

    const overflowRight = Math.round(rect.right - docWidth);
    const overflowLeft = Math.round(-rect.left);

    if (overflowRight > 1 || overflowLeft > 1) {
      offenders.push({
        elemento: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string'
          ? '.' + el.className.trim().split(/\s+/).slice(0, 4).join('.')
          : ''),
        seSaleALaDerecha: overflowRight > 1 ? overflowRight + 'px' : '-',
        seSaleALaIzquierda: overflowLeft > 1 ? overflowLeft + 'px' : '-',
        nodo: el,
      });
      el.style.outline = '2px solid red';
    }
  });

  console.log(`Ancho de pantalla: ${docWidth}px`);
  console.log(`Ancho real del documento: ${document.documentElement.scrollWidth}px`);
  console.log(
    document.documentElement.scrollWidth > docWidth
      ? '❌ HAY SCROLL LATERAL'
      : '✅ Sin scroll lateral'
  );

  if (offenders.length === 0) {
    console.log('✅ Ningún elemento se sale de la pantalla.');
  } else {
    console.table(offenders);
    console.log('Los culpables quedaron marcados con borde rojo. Recargá para quitarlo.');
  }
})();
