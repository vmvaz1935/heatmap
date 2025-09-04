# Dashboard de Atendimentos de Fisioterapia

Este repositório contém um dashboard interativo para análise de atendimentos e pacientes de clínicas de fisioterapia, com visualizações por bairro e ano.

## Conteúdo do Repositório

- `index.html`: O dashboard principal com KPIs, gráficos de evolução e top bairros, e tabelas detalhadas.
- `mapa_bairros_filter.html`: Um mapa interativo dos bairros de São Paulo, acessível a partir do dashboard principal.
- `atendimentos_pacientes_bairro_ano.csv`: O arquivo de dados brutos com informações de atendimentos e pacientes por bairro e ano.
- `bairros.geojson`: O arquivo GeoJSON com a geometria dos bairros de São Paulo para o mapa.
- `assets/css/style.css`: Folha de estilos CSS para o dashboard.
- `assets/js/data.js`: Script JavaScript para carregamento e processamento dos dados.
- `assets/js/charts.js`: Script JavaScript para renderização dos gráficos.
- `assets/js/app.js`: Script JavaScript principal para a lógica do dashboard.

## Como Visualizar o Dashboard

Para visualizar o dashboard, você pode:

1.  **Abrir diretamente no navegador:** Baixe todos os arquivos e abra o arquivo `index.html` em seu navegador.
2.  **Servir localmente com um servidor HTTP:**
    - Certifique-se de ter Python instalado.
    - Navegue até a pasta `fisioterapia_dashboard_github` no terminal.
    - Execute o comando: `python3 -m http.server 8000`
    - Abra seu navegador e acesse: `http://localhost:8000/`

## Como Implantar no GitHub Pages

Você pode facilmente hospedar este dashboard usando o GitHub Pages:

1.  **Crie um novo repositório no GitHub:** Nomeie-o como `fisioterapia-dashboard` (ou o nome que preferir).
2.  **Faça o upload dos arquivos:** Copie todo o conteúdo desta pasta (`fisioterapia_dashboard_github`) para o seu novo repositório.
3.  **Configure o GitHub Pages:**
    - Vá para as configurações do seu repositório no GitHub.
    - Na seção 

GitHub Pages, selecione a branch `main` (ou `master`) e a pasta `/(root)` como fonte.
    - Salve as alterações. O GitHub Pages irá gerar uma URL para o seu dashboard (geralmente `https://[seu-usuario].github.io/[nome-do-repositorio]/`).

## Análise de Dados

Este dashboard oferece as seguintes análises:

- **Métricas Principais:** Total de atendimentos, pacientes únicos, média de atendimentos por paciente e número de bairros atendidos.
- **Evolução Anual:** Gráfico de linha mostrando a tendência de atendimentos ao longo dos anos (2020-2024).
- **Top 10 Bairros:** Gráfico de barras com os bairros que registraram o maior volume de atendimentos.
- **Análise Ano a Ano (YoY):** Tabelas destacando os bairros com os maiores crescimentos e quedas percentuais de atendimentos entre 2023 e 2024.
- **Tabela Detalhada:** Uma tabela paginada e pesquisável com dados detalhados de atendimentos e pacientes por bairro, incluindo participação percentual e média de atendimentos por paciente.

## Tecnologias Utilizadas

- **HTML5:** Estrutura do dashboard.
- **CSS3 (Bootstrap 5):** Estilização e responsividade.
- **JavaScript:** Lógica de carregamento de dados, filtros e interatividade.
- **Chart.js:** Geração de gráficos interativos.
- **Leaflet.js:** Para o mapa interativo (no `mapa_bairros_filter.html`).
- **DataTables.js:** Para a tabela de dados detalhada.

## Contribuição

Sinta-se à vontade para clonar este repositório, explorar os dados e as visualizações, e propor melhorias!

