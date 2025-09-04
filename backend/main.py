from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import pandas as pd
import os


CSV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "atendimentos_pacientes_bairro_ano.csv")


def normalize_bairro(bairro: str) -> str:
    if not isinstance(bairro, str) or not bairro:
        return "NÃO INFORMADO"
    rules = {
        "vl.": "Vila",
        "jd.": "Jardim",
        "sta.": "Santa",
        "sto.": "Santo",
        "s.": "São",
    }
    value = bairro.strip().lower()
    for k, v in rules.items():
        value = value.replace(k, v)
    # remover acentos
    value = (value.encode('ascii', 'ignore').decode('ascii'))
    return value.upper()


class SummaryResponse(BaseModel):
    atTotal: int
    puTotal: int
    mediaAtPorPU: float
    top5Bairros: List[List]


class TableRow(BaseModel):
    ano: int
    bairro: str
    atendimentos: int
    pacientes_unicos: int
    deltaAt: str
    deltaAtPercent: str
    participacao: str


class State:
    df: pd.DataFrame
    years: List[int]
    bairros: List[str]


app = FastAPI(title="Fisio Dashboard API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def load_data():
    if not os.path.exists(CSV_PATH):
        raise RuntimeError(f"CSV não encontrado em {CSV_PATH}")
    df = pd.read_csv(CSV_PATH)
    # Espera colunas específicas
    expected = {"Ano", "Bairro_oficial", "Atendimentos", "Pacientes_unicos"}
    missing = expected - set(df.columns)
    if missing:
        raise RuntimeError(f"Colunas ausentes no CSV: {missing}")

    df = df.copy()
    df["bairro_norm"] = df["Bairro_oficial"].map(normalize_bairro)
    df["Ano"] = pd.to_numeric(df["Ano"], errors="coerce").astype("Int64")
    df["Atendimentos"] = pd.to_numeric(df["Atendimentos"], errors="coerce").fillna(0).astype(int)
    df["Pacientes_unicos"] = pd.to_numeric(df["Pacientes_unicos"], errors="coerce").fillna(0).astype(int)
    df = df.dropna(subset=["Ano"])  # remover linhas sem ano

    State.df = df
    State.years = sorted(df["Ano"].dropna().unique().tolist())
    State.bairros = sorted(df["bairro_norm"].dropna().unique().tolist())


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/years", response_model=List[int])
def years():
    return State.years


@app.get("/neighborhoods", response_model=List[str])
def neighborhoods():
    return State.bairros


@app.get("/summary", response_model=SummaryResponse)
def summary(year: Optional[int] = None):
    df = State.df
    if year is not None:
        df = df[df["Ano"] == year]

    at_total = int(df["Atendimentos"].sum())
    pu_total = int(df["Pacientes_unicos"].sum())
    media = float((at_total / pu_total) if pu_total > 0 else 0)

    by_bairro = df.groupby("bairro_norm").agg(at=("Atendimentos", "sum"), pu=("Pacientes_unicos", "sum")).sort_values("at", ascending=False)
    top5 = by_bairro.head(5)
    # formato compatível com o front atual: [ [bairro, {at, pu}], ... ]
    top5_list = [[idx, {"at": int(row.at), "pu": int(row.pu)}] for idx, row in top5.itertuples()]

    return SummaryResponse(atTotal=at_total, puTotal=pu_total, mediaAtPorPU=media, top5Bairros=top5_list)


@app.get("/atendimentos-ano")
def atendimentos_ano(bairros: Optional[str] = Query(None, description="Lista de bairros separados por vírgula")) -> Dict[str, int]:
    df = State.df
    if bairros:
        selected = [normalize_bairro(b) for b in bairros.split(",") if b.strip()]
        df = df[df["bairro_norm"].isin(selected)]
    grouped = df.groupby("Ano")["Atendimentos"].sum().astype(int)
    return {str(int(year)): int(value) for year, value in grouped.items()}


@app.get("/top-bairros")
def top_bairros(year: Optional[int] = None):
    df = State.df
    if year is not None:
        df = df[df["Ano"] == year]
    by_bairro = df.groupby("bairro_norm").agg(at=("Atendimentos", "sum"), pu=("Pacientes_unicos", "sum")).sort_values("at", ascending=False)
    top5 = by_bairro.head(5)
    return [[idx, {"at": int(row.at), "pu": int(row.pu)}] for idx, row in top5.itertuples()]


@app.get("/table", response_model=List[TableRow])
def table(year: Optional[int] = None, bairros: Optional[str] = Query(None)):
    df = State.df
    if year is not None:
        df = df[df["Ano"] == year]
    if bairros:
        selected = [normalize_bairro(b) for b in bairros.split(",") if b.strip()]
        df = df[df["bairro_norm"].isin(selected)]

    # agregação por (Ano, bairro)
    agg = (
        df.groupby(["Ano", "bairro_norm"], as_index=False)
          .agg(atendimentos=("Atendimentos", "sum"), pacientes_unicos=("Pacientes_unicos", "sum"))
    )

    # calcular deltas em relação ao ano anterior por bairro
    rows: List[TableRow] = []
    # totais do ano para participação
    totals_by_year: Dict[int, int] = agg.groupby("Ano")["atendimentos"].sum().to_dict()

    for bairro, df_b in agg.groupby("bairro_norm"):
        df_b = df_b.sort_values("Ano")
        prev_at = None
        for _, r in df_b.iterrows():
            ano = int(r["Ano"])
            at = int(r["atendimentos"])
            pu = int(r["pacientes_unicos"])
            if prev_at is None:
                delta_at = "-"
                delta_pct = "NA (sem base)"
            else:
                delta_val = at - prev_at
                delta_at = str(delta_val)
                delta_pct = f"{(delta_val/prev_at*100):.2f}%" if prev_at != 0 else "NA (sem base)"
            total_year = totals_by_year.get(ano, 0)
            part = f"{(at/total_year*100):.2f}%" if total_year > 0 else "0.00%"
            rows.append(TableRow(ano=ano, bairro=bairro, atendimentos=at, pacientes_unicos=pu, deltaAt=delta_at, deltaAtPercent=delta_pct, participacao=part))
            prev_at = at

    # ordenar por ano desc e atendimentos desc
    rows.sort(key=lambda x: (x.ano, x.atendimentos), reverse=True)
    return rows


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


