import { isMeasurementSite, type BodyMeasurementDay, type MeasurementSite } from "@guf/core";
import { bodyMeasurementSaveSchema } from "@guf/schemas";
import type { GufClient } from "./client";
import { apiError, toApiError, type ApiResult } from "./result";

/* =====================================================================
 * Contrato — Medidas corporais (Perfil › Medidas corporais). SÓ ONLINE.
 * Dado referente à saúde (LGPD art. 5º, II): só o dono lê (RLS) e gravar exige o consentimento de
 * saúde vigente (art. 11, I). Nada daqui vai para logs, analytics, cache do aparelho ou o GUF AI.
 * ===================================================================== */

export interface BodyMeasurementsOverview {
  /** Consentimento de saúde na versão vigente do termo (sem ele, a tela pede a autorização). */
  hasConsent: boolean;
  /** Dias com medidas, do mais antigo ao mais recente. */
  days: BodyMeasurementDay[];
}

export interface BodyMeasurementSave {
  /** Data local "2026-10-12" (hoje ou um dia passado). */
  measuredOn: string;
  /** cm por local; null apaga o valor daquele local no dia (usado pelo "Desfazer"). */
  values: Partial<Record<MeasurementSite, number | null>>;
}

type Result<T = null> = Promise<ApiResult<T>>;

export interface BodyMeasurementsApi {
  /** Consentimento + todas as medidas da pessoa logada. */
  getBodyMeasurements: (client: GufClient) => Result<BodyMeasurementsOverview>;
  /** Autoriza o uso dos dados de saúde na versão vigente do Termo de Saúde (RPC grant_health_consent). */
  grantHealthConsent: (client: GufClient) => Result;
  /** Grava as medidas de um dia (o mesmo dia de novo substitui os locais enviados). */
  saveBodyMeasurement: (client: GufClient, input: BodyMeasurementSave) => Result;
}

/* =====================================================================
 * Implementação (Supabase)
 * ===================================================================== */

interface MeasurementRow {
  measured_on: string;
  measurement_values: Array<{ site: string; value_cm: number }>;
}

function toMeasurementDay(row: MeasurementRow): BodyMeasurementDay {
  const values: BodyMeasurementDay["values"] = {};
  for (const value of row.measurement_values) {
    if (isMeasurementSite(value.site)) values[value.site] = Number(value.value_cm);
  }
  return { measuredOn: row.measured_on, values };
}

export const getBodyMeasurements: BodyMeasurementsApi["getBodyMeasurements"] = async (client) => {
  try {
    const [consentRes, rowsRes] = await Promise.all([
      client.rpc("has_health_consent"),
      client.from("body_measurements").select("measured_on, measurement_values(site, value_cm)").order("measured_on", { ascending: true }),
    ]);
    if (consentRes.error) return { data: null, error: toApiError(consentRes.error) };
    if (rowsRes.error) return { data: null, error: toApiError(rowsRes.error) };
    const days = rowsRes.data.map(toMeasurementDay).filter((day) => Object.keys(day.values).length > 0);
    return { data: { hasConsent: consentRes.data === true, days }, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const grantHealthConsent: BodyMeasurementsApi["grantHealthConsent"] = async (client) => {
  try {
    const { error } = await client.rpc("grant_health_consent", { p_platform: "web" });
    return error ? { data: null, error: toApiError(error) } : { data: null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const saveBodyMeasurement: BodyMeasurementsApi["saveBodyMeasurement"] = async (client, input) => {
  const parsed = bodyMeasurementSaveSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: apiError("measurement_invalid") };
  try {
    const { error } = await client.rpc("save_body_measurement", { p_measured_on: parsed.data.measuredOn, p_values: parsed.data.values });
    return error ? { data: null, error: toApiError(error) } : { data: null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const bodyMeasurementsApi = {
  getBodyMeasurements,
  grantHealthConsent,
  saveBodyMeasurement,
} satisfies BodyMeasurementsApi;
