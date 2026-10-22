import type { MeasurementPartKey } from "@guf/core";
import { withDevState } from "@/shared/helpers/dev-state-path";

/** Rotas das Medidas corporais (site estático: rota fixa + query string). */
export const MEASUREMENTS_PATH = "/medidas";
export const PROFILE_PATH = "/perfil";

export const measurementsPath = () => withDevState(MEASUREMENTS_PATH);
export const measurementPartPath = (part: MeasurementPartKey) => withDevState(`/medidas/musculo?id=${part}`);
/** Nova medição: com um músculo, só ele aparece (com "Medir outros músculos"); sem, todos. */
export const measurementRegisterPath = (part?: MeasurementPartKey) => withDevState(part ? `/medidas/registrar?musculo=${part}` : "/medidas/registrar");
