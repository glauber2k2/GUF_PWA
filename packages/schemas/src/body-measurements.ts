import { z } from "zod";
import { MEASUREMENT_MAX_CM, MEASUREMENT_SITES, type MeasurementSite } from "@guf/core";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Medidas de um dia antes de gravar (RPC save_body_measurement): cm por local, null apaga o valor
 * (o "Desfazer" usa). Mesmos limites do banco.
 */
export const bodyMeasurementSaveSchema = z.object({
  measuredOn: z.string().regex(ISO_DATE, "Escolha uma data válida."),
  values: z
    .partialRecord(z.enum(MEASUREMENT_SITES as readonly [MeasurementSite, ...MeasurementSite[]]), z.number().gt(0).lt(MEASUREMENT_MAX_CM).nullable())
    .refine((values) => Object.keys(values).length > 0, "Preencha pelo menos uma medida."),
});

export type BodyMeasurementSaveInput = z.infer<typeof bodyMeasurementSaveSchema>;
