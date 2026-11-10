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
  representative: 'Sime Darby Property representative',
  version: 'Demo 1.0',
  sampleSignedOn: '6 November 2026',
}

export const EMERGENCY_ACCESS_STATUS = 'Opted in · Agreement on file'
export const EMERGENCY_ACCESS_CHECK = 'After attempts to contact the resident and an external wellness check are complete with no response from the resident, the appointed team may enter under the resident’s existing opt-in, subject to the entry safeguard below.'
export const EMERGENCY_ACCESS_SAFEGUARD = 'At least two guards or Auxiliary Police officers must enter together, or the single guard or officer entering must wear a body-worn camera activated before entry and recording throughout the check.'
export const EMERGENCY_ACCESS_RESPONSE = 'If the team finds something wrong inside, such as the resident appearing injured, unwell or unresponsive, they call 999 immediately and coordinate emergency help.'

// A reused unit ID alone must not attach this fictional consent to a different family.
export function emergencyAccessFor(unit: Pick<Unit, 'unit_id' | 'resident_name' | 'caregiver_name'>): EmergencyAccessRecord | null {
  return unit.unit_id === madamLeeAgreement.unitId
    && unit.resident_name === madamLeeAgreement.residentName
    && unit.caregiver_name === madamLeeAgreement.caregiverName
    ? madamLeeAgreement : null
}
