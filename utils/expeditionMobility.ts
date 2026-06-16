export type GroundMobility = 'private_vehicle' | 'public_transport' | 'mixed';

export function isGroundMobility(value: unknown): value is GroundMobility {
    return value === 'private_vehicle' || value === 'public_transport' || value === 'mixed';
}

export function mobilityMaterialIcon(mode: GroundMobility): string {
    if (mode === 'private_vehicle') return 'directions_car';
    if (mode === 'public_transport') return 'directions_bus';
    return 'swap_horiz';
}

export function mobilityLocaleKey(mode: GroundMobility): `expedition.mobility.${GroundMobility}` {
    return `expedition.mobility.${mode}`;
}
