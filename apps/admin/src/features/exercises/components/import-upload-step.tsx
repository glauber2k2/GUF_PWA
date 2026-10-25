"use client";

import { useId, useState, type DragEvent } from "react";
import { Download, FileUp } from "lucide-react";
import { CATALOG_IMPORT_ACCEPT, CATALOG_IMPORT_MAX_ROWS } from "@guf/core";
import { Banner, Button, cn, GufLoader, Icon } from "@guf/ui";
import { SectionTitle } from "@/shared/components/panel";

/** Modelo para baixar: cabeçalho reconhecido + exemplos com os nomes como a equipe escreve. */
const TEMPLATE_CSV = "nome;grupo muscular;equipamento\nSupino inclinado com halteres;Peito;Halteres\nPuxada triângulo;Costas;Polia\nAgachamento búlgaro;Quadríceps;Halter\n";
const TEMPLATE_FILE_NAME = "guf-modelo-exercicios.csv";

interface ImportUploadStepProps {
  isReading: boolean;
  error: string | null;
  onFile: (file: File) => void;
}

function downloadTemplate() {
  // BOM: o Excel abre o CSV em UTF-8 sem estragar os acentos.
  const blob = new Blob(["﻿", TEMPLATE_CSV], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = TEMPLATE_FILE_NAME;
  link.click();
  URL.revokeObjectURL(url);
}

/** Passo 1 · escolher (ou arrastar) o arquivo. A conversão acontece no navegador; nada é enviado ainda. */
export function ImportUploadStep({ isReading, error, onFile }: ImportUploadStepProps) {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div className="flex flex-col gap-6">
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex min-h-56 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center",
          "focus-within:border-focus focus-within:shadow-focus",
          isDragging ? "border-accent bg-surface-elevated" : "border-border-strong bg-surface",
        )}
      >
        {isReading ? (
          <GufLoader variant={2} size={48} layout="column" text="Convertendo o arquivo" />
        ) : (
          <>
            <span className="grid size-14 place-items-center rounded-full bg-surface-3 text-accent-text">
              <Icon icon={FileUp} size={26} />
            </span>
            <strong className="text-base">Escolha ou arraste o arquivo</strong>
            <span className="max-w-[420px] text-[13px] text-fg-secondary">
              CSV, TSV, TXT ou JSON, até {CATALOG_IMPORT_MAX_ROWS} exercícios. Você confere tudo antes de cadastrar.
            </span>
          </>
        )}
        <input id={inputId} type="file" accept={CATALOG_IMPORT_ACCEPT} className="sr-only" disabled={isReading} onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }} />
      </label>

      {error && <Banner tone="danger" title="Não foi possível usar este arquivo.">{error}</Banner>}

      <section aria-labelledby="formato-arquivo" className="flex flex-col gap-3">
        <SectionTitle id="formato-arquivo">Formato aceito</SectionTitle>
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 text-[14px] leading-[21px] text-fg-secondary">
          <p className="m-0">
            <strong className="text-fg">Planilha (CSV ou TSV):</strong> colunas <em>nome</em>, <em>grupo muscular</em> e <em>equipamento</em>, separadas por
            ponto e vírgula, vírgula ou tabulação. Sem cabeçalho, vale essa ordem. No Excel ou no Google Planilhas, salve como CSV.
          </p>
          <p className="m-0">
            <strong className="text-fg">Texto:</strong> um exercício por linha, como <code className="text-fg">Supino reto - Peito - Barra</code>.
          </p>
          <p className="m-0">
            <strong className="text-fg">JSON:</strong> uma lista de nomes ou de objetos com <code className="text-fg">name</code>/<code className="text-fg">nome</code>,{" "}
            <code className="text-fg">muscle_group</code>/<code className="text-fg">grupo</code> e <code className="text-fg">equipment</code>/
            <code className="text-fg">equipamento</code>.
          </p>
          <p className="m-0">
            Grupos e equipamentos são reconhecidos por nomes comuns (ex.: &quot;Peitoral&quot; → Peito, &quot;Halteres&quot; → Halter, &quot;Cabo&quot; → Polia).
            Equipamento em branco vira &quot;Outro&quot;. O que não for reconhecido aparece para você escolher.
          </p>
          <Button variant="secondary" icon={Download} onClick={downloadTemplate} className="self-start">
            Baixar modelo CSV
          </Button>
        </div>
      </section>
    </div>
  );
}
