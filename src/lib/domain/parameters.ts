/**
 * The ten mandatory parameters (RF-02). Codes are stable identifiers;
 * `label` and `unit` are what the user sees, so they stay in Spanish.
 * Units are a first guess from the Chopin/Brabender annexes; confirm with the team.
 */
export type EquipmentType = "alveograph" | "farinograph";

export type ParameterDefinition = {
  code: string;
  equipmentType: EquipmentType;
  label: string;
  unit: string;
};

export const PARAMETERS: readonly ParameterDefinition[] = [
  { code: "ALV_P", equipmentType: "alveograph", label: "Tenacidad (P)", unit: "mm H₂O" },
  { code: "ALV_L", equipmentType: "alveograph", label: "Extensibilidad (L)", unit: "mm" },
  { code: "ALV_W", equipmentType: "alveograph", label: "Fuerza panadera (W)", unit: "10⁻⁴ J" },
  { code: "ALV_PL", equipmentType: "alveograph", label: "Relación P/L", unit: "" },
  { code: "ALV_IE", equipmentType: "alveograph", label: "Índice de elasticidad (I.E.)", unit: "%" },
  { code: "FAR_ABS", equipmentType: "farinograph", label: "Absorción de agua", unit: "%" },
  { code: "FAR_DEV", equipmentType: "farinograph", label: "Tiempo de desarrollo", unit: "min" },
  { code: "FAR_STA", equipmentType: "farinograph", label: "Estabilidad", unit: "min" },
  { code: "FAR_SOF", equipmentType: "farinograph", label: "Grado de ablandamiento", unit: "UF" },
  { code: "FAR_ARR", equipmentType: "farinograph", label: "Tiempo de llegada", unit: "min" },
];

export const EQUIPMENT_TYPE_LABEL: Record<EquipmentType, string> = {
  alveograph: "Alveógrafo",
  farinograph: "Farinógrafo",
};

export function parametersFor(type: EquipmentType) {
  return PARAMETERS.filter((p) => p.equipmentType === type);
}
