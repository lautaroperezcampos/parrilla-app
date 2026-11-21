import { dateTimeLabel, money, qty } from './format.js'

// Impresión de comandas y cuentas en impresoras de ticket (térmicas).
// Se imprime con el diálogo del navegador: ahí se elige la impresora
// (la primera vez) y Chrome recuerda la última que se usó.

// Ancho del papel. Para impresoras de 58 mm cambiar a 58 y 48.
const PAPER_MM = 80
const PRINT_MM = 72

export const STATIONS = {
  parrilla: 'Parrilla',
  cocina: 'Cocina'
}

const CSS = `
  @page { size: ${PAPER_MM}mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body { width: ${PRINT_MM}mm; margin: 0 auto; padding: 3mm 0 6mm;
         font-family: 'Courier New', monospace; font-size: 12px; color: #000; }
  h1 { font-size: 20px; text-align: center; margin: 0 0 2px; }
  h2 { font-size: 13px; margin: 6px 0 2px; text-transform: uppercase; }
  p { margin: 2px 0; }
  hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
  .center { text-align: center; }
  .row { display: flex; justify-content: space-between; gap: 6px; }
  .item { font-size: 16px; font-weight: bold; margin: 4px 0; }
  .cancel { font-size: 16px; font-weight: bold; margin: 4px 0; }
  .total { font-size: 18px; font-weight: bold; }
  .small { font-size: 10px; }
`

function escape(text) {
  return String(text ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
}

function orderOrigin(order) {
  return order.table_id ? `MESA ${order.tables?.number ?? ''}` : `MOSTRADOR #${order.id}`
}

// Imprime un HTML en un iframe oculto. En Chrome, print() espera a que
// se cierre el diálogo, así que varias llamadas seguidas salen en orden.
function printHtml(title, body) {
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument
  doc.open()
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${escape(title)}</title><style>${CSS}</style></head><body>${body}</body></html>`
  )
  doc.close()
  iframe.contentWindow.focus()
  iframe.contentWindow.print()
  setTimeout(() => iframe.remove(), 1000)
}

// lines: [{ name, quantity }] — quantity negativa = algo que se sacó
// después de haberlo mandado (sale como "ANULAR").
export function printComanda({ station, order, lines }) {
  const items = lines
    .map((l) =>
      l.quantity > 0
        ? `<p class="item">${qty(l.quantity)} x ${escape(l.name)}</p>`
        : `<p class="cancel">ANULAR ${qty(-l.quantity)} x ${escape(l.name)}</p>`
    )
    .join('')

  printHtml(
    `Comanda ${STATIONS[station]}`,
    `<h1>${escape(STATIONS[station].toUpperCase())}</h1>
     <p class="center"><strong>${escape(orderOrigin(order))}</strong> · ${escape(dateTimeLabel(new Date()))}</p>
     <hr>${items}
     ${order.notes ? `<hr><p><strong>Nota:</strong> ${escape(order.notes)}</p>` : ''}`
  )
}

// La cuenta para el cliente. groups: [{ label, items }] con los ítems
// del pedido (las bebidas van en su propio grupo).
export function printBill({ order, groups }) {
  const rows = groups
    .map(
      (g) =>
        `<h2>${escape(g.label)}</h2>` +
        g.items
          .map(
            (i) =>
              `<div class="row"><span>${qty(i.quantity)} x ${escape(i.product_name)}</span><span>${money(
                i.quantity * i.unit_price
              )}</span></div>`
          )
          .join('')
    )
    .join('')

  printHtml(
    'Cuenta',
    `<h1>PARRILLA DON BLAS</h1>
     <p class="center">${escape(orderOrigin(order))} · ${escape(dateTimeLabel(new Date()))}</p>
     <hr>${rows}<hr>
     <div class="row total"><span>TOTAL</span><span>${money(order.total)}</span></div>
     <hr>
     <p class="center small">NO VÁLIDO COMO FACTURA</p>
     <p class="center">¡Gracias por su visita!</p>`
  )
}
