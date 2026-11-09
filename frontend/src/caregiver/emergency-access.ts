import type { Unit } from '../api/types'

export interface EmergencyAccessRecord {
  readonly unitId: string
  readonly residentName: string
  readonly caregiverName: string
  readonly representative: string
  readonly version: string
  readonly sampleSignedOn: string
}

const madamLeeAgreement: EmergencyAccessRecord = {
  unitId: 'A-105',
  residentName: 'Madam Lee Mei Ling',
  caregiverName: 'Sarah Lee',
  representative: 'Sime Darby Property representative (sample)',
  version: 'Demo 1.0',
  sampleSignedOn: '6 November 2026',
}

export const EMERGENCY_ACCESS_STATUS = 'Opted in · Agreement on file'
export const EMERGENCY_ACCESS_SAFEGUARD = 'Two responders must be present, or a single guard must have an active body-worn camera or a live video call with the caregiver before crossing the threshold and throughout the check.'

// A reused unit ID alone must not attach this fictional consent to a different family.
export function emergencyAccessFor(unit: Pick<Unit, 'unit_id' | 'resident_name' | 'caregiver_name'>): EmergencyAccessRecord | null {
  return unit.unit_id === madamLeeAgreement.unitId
    && unit.resident_name === madamLeeAgreement.residentName
    && unit.caregiver_name === madamLeeAgreement.caregiverName
    ? madamLeeAgreement : null
}
