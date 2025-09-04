## Resumo executivo (priorizado)
- 1) Tokens e tema unificados (Impacto: Alto, Esforço: Baixo)
- 2) Filtros acessíveis com aria-live e skip link (Alto/Baixo)
- 3) Chart.js: legendas, tooltips pt-BR, decimation (Médio/Baixo)
- 4) DataTables responsivo + i18n + mensagens (Alto/Baixo)
- 5) Acessibilidade no mapa (atalho foco, roles) (Médio/Baixo)
- 6) Performance: defer, preconnect, debounce (Médio/Baixo)
- 7) Tipografia e espaçamentos consistentes (Médio/Baixo)
- 8) Responsividade: grids 1 col no mobile (Médio/Baixo)

## Guia visual (tokens)
- Paleta: `--color-primary`, `--color-accent`, superfícies e texto AA.
- Tipografia: Inter/system-ui, pesos 400/600/700.
- Espaçamento: escala 4/8/12/16/24/32px.
- Raios e sombras: `--radius` e `--shadow`.

## Padrões de UX
- Barra de filtros com rótulos, múltipla seleção de bairro, botões Aplicar/Limpar.
- Feedback via `#filtersFeedback` (aria-live="polite").
- Navegação ao mapa permanece por botão; backlog: tabs com estado.

## Snippets aplicados
- Tokens: `styles/tokens.css` e utilitários `styles/theme.css` linkados em `index.html`.
- Filtros acessíveis em `index.html` com IDs compatíveis com `assets/js/app.js` e `aria-live`.
- Chart.js: legend bottom, tooltip pt-BR, decimation.
- DataTables: responsive + i18n pt-BR, mensagens de vazio, dom simplificado.
- Mapa: roles/atalho de foco e zoom control.

## Acessibilidade (WCAG 2.1 AA)
- Contraste ≥ 4.5:1 com tokens; validar com ferramenta de contraste.
- Teclado: skip link, foco visível, roles e `aria-live`.
- Leitor de tela: rótulos de filtros e descrição em canvas via `aria-label`.

## Responsividade
- Breakpoints alvo: ≥1440, ≥1024, ≥768, ≥360. Grids colapsam para 1 coluna.
- KPIs visíveis sem scroll horizontal.

## Desempenho
- `defer` em scripts, `preconnect` para CDN, debounce 200ms nos filtros.
- Evitar reflow de gráficos: `responsive:true`, `maintainAspectRatio:false`, sem animação.

## Casos de teste
- Dataset vazio: DataTables exibe mensagem; tooltips tratam `0`.
- Muitos bairros: DataTables responsivo; Chart.js com decimation.
- Ano sem registros: deltas `NA (sem base)`; participação 0.00%.
- Rede lenta: `defer` mantém interatividade básica.
- Mobile: navegação por teclado e foco visível.

## Backlog (TODO)
- Tabs Dashboard ↔ Mapa com estado ativo.
- Leaflet marker clustering via CDN, se pontos > 1k.
- Toggle de tema claro/escuro.
- Exportação PDF (placeholder em `app.js`).

## Ambiguidades
- Cores originais hard-coded em alguns trechos permanecem e serão trocadas gradualmente por tokens.
- Séries temporais curtas atualmente; decimation é preventiva.

