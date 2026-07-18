# Monad Wallet Dashboard — Local (Rediseño Dorado)

Dashboard de transparencia para wallets Monad con reportes anuales pagados on-chain. Versión **solo para desarrollo local**, sin configuración de Vercel ni nada extra.

## ⚡ Arranque rápido

```bash
npm install
npm run dev
```

Abre **http://localhost:5173** y verás la UI dorada arrancando en el tab **Annual Reports** con las 3 columnas.

## 🛠 Stack

- **React 19** + **TypeScript** + **Vite 7**
- **Tailwind CSS 4** (via `@tailwindcss/vite`)
- **shadcn/ui** (Radix primitives)
- **ethers 6** — conexión con MetaMask / Rabby
- **recharts** — gráfico donut del reporte anual
- **xlsx** + **jspdf** + **jspdf-autotable** + **html2canvas** — exportación PDF/Excel

## 📜 Scripts

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor de desarrollo con hot-reload en `:5173` |
| `npm run build` | Compila a `dist/` (producción) |
| `npm run preview` | Sirve el build de producción localmente para probarlo |

## 🎨 Qué incluye el rediseño

- **Layout de 3 columnas** en Annual Reports: Recent Transactions · Annual Report {año} · Your Holdings.
- **Paleta dorada** sobre negro profundo.
- **Toggle claro/oscuro** en el header con transición suave de 350 ms, persistido en `localStorage`.
- **Modal informativo** "¿Qué es el reporte anual?" — explica el flujo, el fee de 1 MON, y que **todos los datos son públicos** on-chain.
- **Animaciones** de entrada por columna, hover-lift en tarjetas, scrollbars dorados delgados.
- **Botones dorados** con degradado + glow para "Generate Annual Report", y verde/rojo para Excel/PDF.

La lógica de negocio (wallet, MonadScan, contrato `MonadWalletReport.sol`, exportaciones) **no cambia** — solo se re-estiliza y reorganiza.

## 🔗 Contrato on-chain

El frontend está conectado por ABI + dirección al contrato **`MonadWalletReport`** desplegado en Monad:

```
0x316Cea81C4D8BBbB9cfF2D432d90CB5d4dc4D6b1
```

**El contrato es la única fuente de verdad** para saber si una wallet tiene un reporte anual generado. **No se cachea nada en `localStorage`** sobre la existencia del reporte: cualquier usuario que conecte la misma wallet desde otro navegador o dispositivo verá siempre el mismo resultado, leído directamente de la blockchain.

Funciones consumidas por la UI:

| Función | Dónde se usa |
|---|---|
| `hasReport(address user, uint256 year) → bool` | Al conectar wallet, para decidir landing/home/dashboard |
| `getReport(uint256 year) → (bool exists, uint256 reportYear, uint256 generatedAt)` | Al mostrar el dashboard, para leer la fecha on-chain de generación |
| `generateReport(uint256 year) payable` | Botón *Pay & Unlock* — envía `msg.value = reportPrice` (por defecto 1 MON) |
| `reportPrice() → uint256` | Se lee justo antes de firmar la tx para que la UI siempre pague el precio vigente si el owner lo cambió |

Si rediploys el contrato, cambia la constante `MONAD_WALLET_REPORT_ADDRESS` en `src/lib/contract.ts` (es el ÚNICO lugar donde vive esa dirección).

## 🔌 Cómo usarlo dentro de la app

1. Pulsa **Connect Wallet** (arriba a la derecha) → MetaMask o Rabby.
2. Pega tu **API key de MonadScan** (gratis en https://monadscan.com/myapikey) en el popover de la wallet.
3. La app consulta automáticamente `hasReport(tuWallet, añoActual)` sobre el contrato configurado.
4. Si no existe reporte, pulsa **Generate Annual Report (1 MON)** → firma la tx → la app espera confirmación → dashboard.
5. Descarga el reporte en **Excel** o **PDF** desde la tarjeta central.

## 📁 Estructura

```
.
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── components.json          # config de shadcn/ui
├── public/
│   ├── favicon.svg
│   └── robots.txt
└── src/
    ├── main.tsx             # entrypoint
    ├── App.tsx              # ThemeProvider + WalletProvider + Tabs + header
    ├── index.css            # tokens dorados + utilities del rediseño
    ├── components/
    │   ├── AnnualReportDashboard.tsx
    │   ├── ContractExecutor.tsx
    │   ├── NFTTokenViewer.tsx
    │   ├── TransactionViewer.tsx
    │   ├── WalletConnector.tsx
    │   ├── OverviewGrid.tsx       ← layout de 3 columnas (rediseño)
    │   ├── AboutReportModal.tsx   ← modal "¿Qué es?" (rediseño)
    │   ├── ThemeToggle.tsx        ← botón sol/luna (rediseño)
    │   └── ui/                    ← shadcn primitives
    ├── hooks/
    │   ├── use-wallet.tsx
    │   ├── use-contract.ts        ← wrapper MonadWalletReport (usa ABI compartido)
    │   ├── useReport.ts           ← hook principal on-chain (check / get / generate)
    │   ├── use-monadscan.ts
    │   ├── use-balance.ts
    │   ├── use-local-storage.ts
    │   ├── use-mobile.tsx
    │   ├── use-toast.ts
    │   └── use-theme.tsx          ← provider light/dark (rediseño)
    ├── lib/
    │   ├── contract.ts            ← ABI + dirección + reads/writes del contrato
    │   └── utils.ts
    └── pages/
        └── not-found.tsx
```

## 🐛 Solución de problemas

**`npm install` falla con conflicto de peer dependencies**
→ Usa `npm install --legacy-peer-deps` (React 19 aún tiene algunas libs sin actualizar sus peers).

**`window.ethereum is undefined` al conectar wallet**
→ Instala MetaMask o Rabby en tu navegador.

**El donut chart aparece cortado**
→ La columna central necesita ≥ 360 px de ancho; en móvil el grid colapsa a una columna automáticamente.

**Puerto 5173 ocupado**
→ Cambia el puerto en `vite.config.ts` (`server.port`) o corre `npx vite --port 3000`.
