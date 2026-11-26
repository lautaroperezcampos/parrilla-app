import { adjustmentLabel, dateTimeLabel, money, paymentLabel, qty } from './format.js'

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

// Cómo se agrupan los ítems en pantalla y en la cuenta. Lo que no tiene
// estación (bebidas y otros) no sale en ninguna comanda.
const GROUPS = [
  { station: 'parrilla', label: 'Parrilla' },
  { station: 'cocina', label: 'Cocina' },
  { station: null, label: 'Bebidas' }
]

export function stationOf(item) {
  return item.products?.print_station ?? null
}

export function groupItems(items) {
  return GROUPS.map((g) => ({ ...g, items: items.filter((i) => stationOf(i) === g.station) })).filter(
    (g) => g.items.length > 0
  )
}

// Las impresoras térmicas reciben la hoja como imagen: las letras finas o
// grises salen cortadas. Por eso todo va en negro puro, negrita y una
// letra sin serifa, sin suavizado de bordes.
const CSS = `
  @page { size: ${PAPER_MM}mm auto; margin: 0; }
  * { box-sizing: border-box; color: #000 !important; -webkit-font-smoothing: none; }
  body { width: ${PRINT_MM}mm; margin: 0 auto; padding: 2mm 0 4mm;
         font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 700;
         line-height: 1.25; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  h1 { font-size: 22px; font-weight: 900; text-align: center; margin: 0 0 2px; }
  h2 { font-size: 14px; font-weight: 900; margin: 6px 0 2px; text-transform: uppercase; }
  p { margin: 2px 0; }
  hr { border: 0; border-top: 2px dashed #000; margin: 6px 0; }
  .center { text-align: center; }
  .row { display: flex; justify-content: space-between; gap: 6px; }
  .item { font-size: 18px; font-weight: 900; margin: 5px 0; }
  .cancel { font-size: 18px; font-weight: 900; margin: 5px 0; text-decoration: underline; }
  .total { font-size: 22px; font-weight: 900; }
  .small { font-size: 12px; }
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

// La cuenta para el cliente, con los ítems agrupados (las bebidas van en
// su propio grupo). Si la venta ya se cobró, sale con la fecha del cobro
// y el medio de pago.
export function printBill(order) {
  const rows = groupItems(order.order_items)
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
     <p class="center">${escape(orderOrigin(order))} · ${escape(dateTimeLabel(order.paid_at ?? new Date()))}</p>
     ${order.paid_at ? `<p class="center">Venta #${order.id}</p>` : ''}
     <hr>${rows}<hr>
     ${
       adjustmentLabel(order)
         ? `<div class="row"><span>Subtotal</span><span>${money(order.subtotal)}</span></div>
            <div class="row"><span>${escape(adjustmentLabel(order))}</span><span>${
              Number(order.total) >= Number(order.subtotal) ? '+' : '-'
            } ${money(Math.abs(order.total - order.subtotal))}</span></div>`
         : ''
     }
     <div class="row total"><span>TOTAL</span><span>${money(order.total)}</span></div>
     ${order.payment_method ? `<p>Pago: ${escape(paymentLabel(order.payment_method))}</p>` : ''}
     <hr>
     <p class="center small">NO VÁLIDO COMO FACTURA</p>
     <p class="center">¡Gracias por su visita!</p>`
  )
}
